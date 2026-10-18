"""算法知识库 API 路由"""

import logging

from flask import Blueprint, jsonify, request

from aag.api.services.knowledge_base_service import KnowledgeBaseService

logger = logging.getLogger(__name__)

bp = Blueprint("knowledge_base", __name__, url_prefix="/api")

knowledge_base_service = KnowledgeBaseService()


@bp.route("/algorithms", methods=["GET"])
def get_algorithms():
    """获取算法列表，支持搜索和分类过滤"""
    try:
        search = request.args.get("search", "").strip() or None
        category = request.args.get("category", "").strip() or None
        lang = request.args.get("lang", "zh-CN")

        result = knowledge_base_service.get_algorithms(
            search=search, category=category, lang=lang
        )

        if result.get("success"):
            return jsonify(result)
        else:
            return jsonify(result), 500
    except Exception as e:
        logger.error("获取算法列表失败: %s", e, exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/algorithms/categories", methods=["GET"])
def get_categories():
    """获取算法分类列表"""
    try:
        lang = request.args.get("lang", "zh-CN")
        result = knowledge_base_service.get_categories(lang=lang)

        if result.get("success"):
            return jsonify(result)
        else:
            return jsonify(result), 500
    except Exception as e:
        logger.error("获取分类列表失败: %s", e, exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/algorithms/<algorithm_id>", methods=["GET"])
def get_algorithm_detail(algorithm_id):
    """获取算法详情"""
    try:
        lang = request.args.get("lang", "zh-CN")
        result = knowledge_base_service.get_algorithm(
            algorithm_id=algorithm_id, lang=lang
        )

        if result.get("success"):
            return jsonify(result)
        else:
            status = 404 if "not found" in str(result.get("error", "")).lower() else 500
            return jsonify(result), status
    except Exception as e:
        logger.error("获取算法详情失败: %s", e, exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/algorithms", methods=["POST"])
def create_algorithm():
    """新增算法（耗时较长，会联网检索资料并调用 LLM）"""
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get("name", "") or "").strip()
        lang = data.get("lang", "zh-CN")
        overwrite = bool(data.get("overwrite", False))

        if not name:
            return jsonify({"success": False, "error": "Algorithm name is required"}), 400

        result = knowledge_base_service.create_algorithm(
            name=name, lang=lang, overwrite=overwrite
        )

        if result.get("success"):
            return jsonify(result)
        else:
            return jsonify(result), 500
    except Exception as e:
        logger.error("新增算法失败: %s", e, exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500
