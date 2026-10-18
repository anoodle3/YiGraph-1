"""
算法知识库服务
封装算法列表、分类、详情查询和自动扩展能力
"""

import logging
from typing import Any, Callable, Dict, Optional

from aag.knowledge_base.knowledge_base_management.basic import (
    get_algorithm_detail,
    get_algorithm_list,
    get_category_list,
)
from aag.knowledge_base.knowledge_base_management.expand import create_algorithm


logger = logging.getLogger(__name__)


class KnowledgeBaseService:
    """
    算法知识库服务
    对应 knowledge_base_management/1.md 中的 4 个后端功能。
    """

    def get_algorithms(
        self,
        search: Optional[str] = None,
        category: Optional[str] = None,
        lang: str = "zh-CN",
    ) -> Dict[str, Any]:
        """
        获取算法列表。

        Args:
            search: 按 name / displayName / tags 模糊搜索
            category: 按分类过滤
            lang: 返回语言，默认 zh-CN

        Returns:
            {"success": true, "data": [...], "total": n}
        """
        try:
            return get_algorithm_list(search=search, category=category, lang=lang)
        except Exception as exc:
            logger.error("获取算法列表失败: %s", exc, exc_info=True)
            return {"success": False, "error": str(exc)}

    def get_categories(self, lang: str = "zh-CN") -> Dict[str, Any]:
        """
        获取算法分类列表。

        Args:
            lang: 返回语言，默认 zh-CN

        Returns:
            {"success": true, "data": [...]}
        """
        try:
            return get_category_list(lang=lang)
        except Exception as exc:
            logger.error("获取算法分类失败: %s", exc, exc_info=True)
            return {"success": False, "error": str(exc)}

    def get_algorithm(self, algorithm_id: str, lang: str = "zh-CN") -> Dict[str, Any]:
        """
        获取算法详情。

        Args:
            algorithm_id: 算法 ID，支持 run_pagerank 或 pagerank
            lang: 返回语言，默认 zh-CN

        Returns:
            {"success": true, "data": {...}}；不存在时返回 {"success": false, "error": "..."}
        """
        try:
            if not str(algorithm_id or "").strip():
                return {"success": False, "error": "Algorithm id is required"}

            result = get_algorithm_detail(algorithm_id, lang=lang)
            if result is None:
                return {"success": False, "error": f"Algorithm not found: {algorithm_id}"}
            return result
        except Exception as exc:
            logger.error("获取算法详情失败: %s", exc, exc_info=True)
            return {"success": False, "error": str(exc)}

    def create_algorithm(
        self,
        name: str,
        lang: str = "zh-CN",
        overwrite: bool = False,
        progress: Optional[Callable[[str], None]] = None,
    ) -> Dict[str, Any]:
        """
        新增算法。

        Args:
            name: 算法名
            lang: 返回语言，默认 zh-CN
            overwrite: 是否覆盖 algorithms_new.yaml 中已有条目
            progress: 可选进度回调

        Returns:
            {"success": true, "data": {...}}
        """
        try:
            if not str(name or "").strip():
                return {"success": False, "error": "Algorithm name is required"}

            progress_callback = progress or self._log_progress
            return create_algorithm(
                name,
                lang=lang,
                overwrite=overwrite,
                progress=progress_callback,
            )
        except Exception as exc:
            logger.error("新增算法失败: %s", exc, exc_info=True)
            return {"success": False, "error": str(exc)}

    @staticmethod
    def _log_progress(message: str) -> None:
        logger.info("[knowledge-base] %s", message)
