import logging
import os
import atexit
import sys

from flask import Flask, redirect, send_from_directory, abort
from flask_cors import CORS
from flask_socketio import SocketIO 

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
# Propagate to subprocesses (e.g. MCP servers launched via python -m)
existing_pythonpath = os.environ.get('PYTHONPATH', '')
if PROJECT_ROOT not in existing_pythonpath.split(os.pathsep):
    os.environ['PYTHONPATH'] = os.pathsep.join(
        [p for p in [PROJECT_ROOT, existing_pythonpath] if p]
    )

from aag.api.async_runtime import start_async_runtime, stop_async_runtime


# Global logging configuration (set once)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


class HealthCheckFilter(logging.Filter):
    """探活轮询（前端每几秒一次 GET /api/health）无诊断价值，从访问日志中过滤。"""

    def filter(self, record):
        return "/api/health" not in record.getMessage()


logging.getLogger("werkzeug").addFilter(HealthCheckFilter())

socketio = SocketIO(cors_allowed_origins="*")


def create_app():
    # Current file directory
    base_dir = os.path.dirname(os.path.abspath(__file__))

    app = Flask(__name__)

    CORS(app)

    # ====== 静态托管 Next.js 导出产物（单端口形态，out/ 存在时启用） ======
    next_out_dir = os.path.abspath(os.path.join(base_dir, '..', 'next-app', 'out'))
    has_frontend_export = os.path.isfile(os.path.join(next_out_dir, 'index.html'))

    if has_frontend_export:
        logger.info("Serving frontend static export from %s", next_out_dir)

        @app.route('/')
        def frontend_index():
            return send_from_directory(next_out_dir, 'index.html')

        @app.route('/<path:path>')
        def frontend_static(path):
            # 未知后端路径（API / SocketIO）不应回退到前端页面
            if path.startswith('api/') or path.startswith('socket.io'):
                abort(404)
            full = os.path.join(next_out_dir, path)
            if os.path.isfile(full):
                return send_from_directory(next_out_dir, path)
            if os.path.isfile(full + '.html'):
                return send_from_directory(next_out_dir, path + '.html')
            index_in_dir = os.path.join(full, 'index.html')
            if os.path.isfile(index_in_dir):
                return send_from_directory(os.path.dirname(index_in_dir), 'index.html')
            # SPA fallback：未命中文件的前端路由回退到 index.html
            return send_from_directory(next_out_dir, 'index.html')
    else:
        @app.route('/')
        def index():
            return redirect('http://localhost:3000')

    # ====== Register blueprints (route modules) ======
    from .routes_health import bp as health_bp
    from .routes_documents import bp as documents_bp
    from .routes_manage_dataset import bp as manage_bp
    from .routes_models import bp as models_bp
    from .routes_knowledge_base import bp as knowledge_base_bp
    from .routes_feedback import bp as feedback_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(manage_bp)
    app.register_blueprint(models_bp)
    app.register_blueprint(knowledge_base_bp)
    app.register_blueprint(feedback_bp)

    # ====== Initialize SocketIO and async runtime ======
    socketio.init_app(app)
    start_async_runtime()
    atexit.register(stop_async_runtime)

    # Warm up algorithm caches on startup so the first request is fast
    # from aag.knowledge_base.knowledge_base_management.basic import _get_formatted_algorithms, DEFAULT_LANG
    # _get_formatted_algorithms(DEFAULT_LANG)
    # logger.info("Algorithm cache warmed up")
 
    # ====== Register WebSocket event handlers ======
    try:
        from . import sockets_chat  
        logger.info("WebSocket event module sockets_chat loaded")
    except ImportError as e:
        logger.warning(f"Failed to import sockets_chat: {e}")

    return app