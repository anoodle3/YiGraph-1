"""
Chat service: wraps AAG engine chat, handles user messages.
"""

import logging
import asyncio
from typing import Dict, Any, Optional, Callable, List
import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from .engine_service import EngineService
from aag.models.graph_workflow_dag import dag_info_to_frontend_format

logger = logging.getLogger(__name__)

# Unified error message for chat UI (returned as type: result so it shows in the bubble, not a popup)
CHAT_FRIENDLY_ERROR_MSG = "Request failed. Please try again later."


def _is_scheduler_error_text(text: str) -> bool:
    """Whether the text is a scheduler business error string (should be shown as friendly message)."""
    if not text or not isinstance(text, str):
        return False
    t = text.strip()
    return t.startswith("⚠️") or t.startswith("❌") or "错误：" in t or "Error:" in t


class ChatService:
    """
    Chat service: wraps AAG engine chat.
    Modes: normal / interact / expert.
    """

    def __init__(self):
        """Initialize chat service."""
        self.engine_service = EngineService.get_instance()
    
    async def process_message(
        self,
        message: str,
        model: Optional[str] = None,
        dataset: Optional[str] = None,
        mode: str = "normal",
        expert_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Process a user message (sync-style API).

        Args:
            message: User message.
            model: Model name (optional, for logging).
            dataset: Dataset name (optional).
            mode: "normal" | "interact" | "expert".
            expert_mode: Legacy frontend flag (True => use interact).

        Returns:
            Result dict.
        """
        try:
            if expert_mode:
                mode = "interact"

            engine = self.engine_service.get_engine()

            if dataset:
                logger.info(f"Select dataset: {dataset}")
                engine.specific_dataset(dataset)

            logger.info(f"Process message: mode={mode}, model={model}, message={message[:50]}...")

            result = await engine.run(message, mode=mode)

            return {
                "success": True,
                "result": result,
                "mode": mode
            }
        except Exception as e:
            logger.error(f"Process message failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "mode": mode
            }
    
    async def process_dag_modification(
        self,
        modification_request: str,
        callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Handle DAG modification request (expert mode).

        Args:
            modification_request: User modification request.
            callback: Optional callback for streaming events
                (subproblems after revision / algorithm_selected per step).

        Returns:
            Dict with updated DAG info.
        """
        try:
            engine = self.engine_service.get_engine()
            logger.info(f"Process DAG modification: {modification_request[:50]}...")

            result = await engine.expert_modify_dag(modification_request, callback=callback)

            return {
                "success": True,
                **result
            }
        except Exception as e:
            logger.error(f"DAG modification failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def start_expert_analysis(self) -> Dict[str, Any]:
        """
        Start expert-mode analysis.

        Returns:
            Analysis result dict.
        """
        try:
            engine = self.engine_service.get_engine()
            logger.info("Start expert-mode analysis")

            result = await engine.expert_start_analysis()

            return {
                "success": True,
                "result": result
            }
        except Exception as e:
            logger.error(f"Expert analysis failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def process_streaming_chat(
        self,
        message: str,
        model: Optional[str] = None,
        dataset: Optional[str] = None,
        dataset_type: Optional[str] = None,
        mode: str = "normal",
        expert_mode: bool = False,
        callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ):
        """
        Stream chat (for WebSocket).

        Args:
            message: User message.
            model: Model name (optional).
            dataset: Dataset name (optional).
            dataset_type: "text" | "graph" (optional).
            mode: "normal" | "interact" | "expert".
            expert_mode: Legacy flag (True => interact).
            callback: Callback for streaming chunks; signature callback(data: Dict[str, Any]).
        """
        try:
            if expert_mode:
                mode = "interact"

            engine = self.engine_service.get_engine()

            if callback:
                callback({
                    "type": "thinking",
                    "contentType": "text",
                    "content": "Analyzing your question...",
                    "placeholder": True
                })

            # 包装回调：调度器在规划阶段已通过 callback 流式下发过 DAG，
            # 这里跟踪并避免 engine.run 返回后重复发送
            streamed_dag = {"value": False}

            def wrapped_callback(data_chunk: Dict[str, Any]):
                if data_chunk.get("contentType") == "dag":
                    streamed_dag["value"] = True
                callback(data_chunk)

            engine_callback = wrapped_callback if callback else None

            if dataset:
                logger.info(f"Select dataset: {dataset}, type: {dataset_type}")
                engine.specific_dataset(dataset, dataset_type)

            logger.info(f"Stream chat: mode={mode}, message={message[:50]}...")

            result = await engine.run(message, mode=mode, callback=engine_callback)

            if mode in {"interact", "expert"} and isinstance(result, dict) and "dag_info" in result:
                if callback and not streamed_dag["value"]:
                    dag_content = self._convert_dag_to_frontend_format(result)
                    callback({
                        "type": "result",
                        "contentType": "dag",
                        "content": dag_content
                    })
            elif mode in {"interact", "expert"} and isinstance(result, dict) and "error" in result:
                if callback:
                    callback({
                        "type": "result",
                        "contentType": "text",
                        "content": CHAT_FRIENDLY_ERROR_MSG
                    })
            elif mode == "normal" and isinstance(result, dict) and "dag_info" in result:
                # Normal mode: result has DAG info — scheduler has already streamed it;
                # only send here as fallback (e.g. old scheduler without streaming)
                if callback and not streamed_dag["value"]:
                    dag_content = self._convert_dag_to_frontend_format({
                        "dag_info": result.get("dag_info", {})
                    })
                    callback({
                        "type": "result",
                        "contentType": "dag",
                        "content": dag_content
                    })

                result_text = result.get("analysis_result", "")
                if callback and result_text:
                    paragraphs = [p.strip() for p in result_text.split('\n') if p.strip()]
                    for para in paragraphs:
                        callback({
                            "type": "result",
                            "contentType": "text",
                            "content": para
                        })
            else:
                result_text = str(result) if result else "No result."
                if _is_scheduler_error_text(result_text):
                    result_text = CHAT_FRIENDLY_ERROR_MSG
                if callback:
                    paragraphs = [p.strip() for p in result_text.split('\n') if p.strip()]
                    for para in paragraphs:
                        callback({
                            "type": "result",
                            "contentType": "text",
                            "content": para
                        })
            if callback:
                callback({
                    "type": "stream_end"
                })
                
        except Exception as e:
            logger.error(f"Stream chat failed: {str(e)}", exc_info=True)
            if callback:
                callback({
                    "type": "result",
                    "contentType": "text",
                    "content": CHAT_FRIENDLY_ERROR_MSG
                })
                callback({"type": "stream_end"})
            return
    
    def _convert_dag_to_frontend_format(self, dag_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert DAG result to frontend format (delegates to shared helper).

        Args:
            dag_result: DAG result from AAG engine.

        Returns:
            DAG data for frontend.
        """
        try:
            return dag_info_to_frontend_format(dag_result.get("dag_info", {}))
        except Exception as e:
            logger.error(f"Convert DAG format failed: {str(e)}")
            return {
                "nodes": [],
                "edges": []
            }
    
    def process_dag_confirmation(
        self,
        dag_confirm: str,
        callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Handle DAG confirmation (yes/no).

        Args:
            dag_confirm: "yes" or "no".
            callback: Callback for streaming.

        Returns:
            Result dict.
        """
        if dag_confirm == "yes":
            return self.start_expert_analysis()
        else:
            if callback:
                callback({
                    "type": "result",
                    "contentType": "text",
                    "content": "DAG rejected. Please modify and resubmit."
                })
            return {
                "success": True,
                "message": "DAG rejected"
            }
