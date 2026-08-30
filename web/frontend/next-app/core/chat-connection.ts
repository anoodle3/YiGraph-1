import { getBaseUrl } from "./api/base"
import { connectChatSocket, getChatSocket } from "./api/chat"

let started = false

/** 幂等：确保聊天 socket 已创建。重复调用无副作用。 */
export function ensureChatConnection(): void {
  if (started || getChatSocket()) return
  started = true
  void (async () => {
    const url = await getBaseUrl()
    connectChatSocket(url)
  })()
}
