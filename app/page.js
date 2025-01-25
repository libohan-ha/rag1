'use client';
import { useState } from "react";
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

// 从环境变量获取配置
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const WORKSPACE_ID = process.env.NEXT_PUBLIC_WORKSPACE_ID;

// 消息类型
const MessageType = {
  AI: 'ai',
  USER: 'user'
};

// Markdown组件
const MarkdownContent = ({ content }) => {
  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      className="prose prose-sm max-w-none dark:prose-invert"
      components={{
        // 自定义链接在新标签页打开
        a: ({ node, ...props }) => (
          <a target="_blank" rel="noopener noreferrer" {...props} />
        ),
        // 调整代码块样式
        pre: ({ node, ...props }) => (
          <pre className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto" {...props} />
        ),
        // 调整行内代码样式
        code: ({ node, inline, ...props }) => (
          inline 
            ? <code className="bg-gray-100 px-1 py-0.5 rounded" {...props} />
            : <code {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default function Home() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [messages, setMessages] = useState([
    { type: MessageType.AI, content: '你好！我是AI助手，有什么我可以帮你的吗？' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 发送消息到API
  const sendMessage = async (message) => {
    try {
      console.log('发送消息:', message);
      
      const response = await fetch(`${API_URL}/api/v1/workspace/${WORKSPACE_ID}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`
        },
        body: JSON.stringify({
          message,
          mode: 'chat'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // 只返回文本回复部分
      return { text: data.textResponse || '无回复内容' };
    } catch (error) {
      console.error('发送消息失败:', error);
      setError(error.message);
      throw error;
    }
  };

  // 处理发送消息
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setError('');
    setMessages(prev => [...prev, { type: MessageType.USER, content: userMessage }]);
    
    setIsLoading(true);
    try {
      const response = await sendMessage(userMessage);
      setMessages(prev => [...prev, { type: MessageType.AI, content: response.text }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        type: MessageType.AI, 
        content: `错误: ${error.message}. 请检查AnythingLLM服务是否正在运行。` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理按回车发送
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 移动端菜单按钮 */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={showSidebar ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>

      {/* 左侧会话列表 */}
      <div className={`
        w-64 bg-white border-r fixed md:static h-full z-40
        transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">会话列表</h2>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-64px)]">
          {/* 会话列表项 */}
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="p-4 hover:bg-gray-50 cursor-pointer border-b"
              onClick={() => setShowSidebar(false)}
            >
              <div className="font-medium">会话 {item}</div>
              <div className="text-sm text-gray-500">上次聊天时间...</div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 聊天头部 */}
        <div className="p-4 border-b bg-white">
          <h1 className="text-xl font-semibold ml-12 md:ml-0">当前会话</h1>
        </div>

        {/* 聊天消息区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg">
              {error}
            </div>
          )}
          
          {messages.map((message, index) => (
            message.type === MessageType.AI ? (
              // AI消息
              <div key={index} className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0" />
                <div className="bg-white p-3 rounded-lg shadow max-w-[80%]">
                  <MarkdownContent content={message.content} />
                </div>
              </div>
            ) : (
              // 用户消息
              <div key={index} className="flex items-start space-x-3 justify-end">
                <div className="bg-blue-500 p-3 rounded-lg shadow max-w-[80%]">
                  <p className="text-white">{message.content}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" />
              </div>
            )
          ))}
          
          {/* Loading状态 */}
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0" />
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t bg-white">
          <div className="flex space-x-4">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className={`px-6 py-2 rounded-lg transition-colors ${
                isLoading || !inputMessage.trim()
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isLoading ? '发送中...' : '发送'}
            </button>
          </div>
        </div>
      </div>

      {/* 移动端遮罩层 */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
}
