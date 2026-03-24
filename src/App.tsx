/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { 
  Search, 
  BookOpen, 
  FileText, 
  Send, 
  Menu, 
  X, 
  ChevronRight,
  Gavel,
  Info,
  History,
  Briefcase,
  Ruler,
  Coins,
  LayoutGrid,
  Settings,
  Palette,
  Type,
  PlusCircle,
  Download,
  Trash2,
  ShieldAlert,
  Phone,
  RefreshCw,
  Sun,
  Moon
} from 'lucide-react';
import { cn } from './lib/utils';

// Initialize Gemini API
// (Moved inside handleSend to ensure the latest API key is used)

const DOCUMENTS = [
  { 
    id: 'vbhn-43', 
    title: 'VBHN 43/VBHN-VPQH (27/2/2025)', 
    fullName: 'Văn bản hợp nhất 43/VBHN-VPQH ngày 27/2/2025',
    description: '(Hợp nhất các Luật số 50/2014/QH13, 62/2020/QH14 và các luật liên quan)'
  },
  { 
    id: 'nd-175', 
    title: 'Nghị định 175/2024/NĐ-CP', 
    fullName: 'Nghị định 175/2024/NĐ-CP ngày 30/12/2024',
    description: 'Quy định chi tiết một số điều và biện pháp thi hành luật xây dựng về quản lý hoạt động xây dựng (Sửa đổi, bổ sung Nghị định số 15/2021/NĐ-CP)'
  },
  { 
    id: 'vbhn-01', 
    title: 'VBHN 01/VBHN-BXD (6/2/2025)', 
    fullName: 'Văn bản hợp nhất số 01/VBHN-BXD ngày 6/2/2025',
    description: 'Quy định về quản lý chất lượng, thi công xây dựng và bảo trì công trình xây dựng (Hợp nhất các Nghị định 06/2021, 35/2023, 175/2024)'
  },
  { 
    id: 'vbhn-06', 
    title: 'VBHN 06/VBHN-BXD (14/8/2023)', 
    fullName: 'Văn bản hợp nhất số 06/VBHN-BXD ngày 14/8/2023',
    description: 'Quy định về quản lý chi phí đầu tư xây dựng (Hợp nhất các Nghị định 10/2021 và 35/2023)'
  },
  { 
    id: 'vbhn-07', 
    title: 'VBHN 07/VBHN-BXD (16/8/2023)', 
    fullName: 'Văn bản hợp nhất số 07/VBHN-BXD ngày 16/8/2023',
    description: 'Quy định chi tiết về hợp đồng xây dựng (Hợp nhất các Nghị định 37/2015, 50/2021, 35/2023)'
  },
];

const SUGGESTION_CARDS = [
  {
    title: 'Lập, thẩm định dự án & Quyết định đầu tư',
    description: 'Quy trình lập, thẩm định dự án và quyết định đầu tư xây dựng.',
    icon: <FileText size={20} />,
    query: 'Quy trình lập, thẩm định dự án và quyết định đầu tư xây dựng'
  },
  {
    title: 'Quản lý thực hiện dự án đầu tư',
    description: 'Các quy định về quản lý thực hiện dự án đầu tư xây dựng.',
    icon: <Briefcase size={20} />,
    query: 'Quy định về quản lý thực hiện dự án đầu tư xây dựng'
  },
  {
    title: 'Khảo sát & Thiết kế xây dựng',
    description: 'Quy chuẩn về khảo sát xây dựng và thiết kế xây dựng công trình.',
    icon: <Ruler size={20} />,
    query: 'Quy định về khảo sát xây dựng và thiết kế xây dựng'
  },
  {
    title: 'Dự án đầu tư xây dựng công trình',
    description: 'Các quy định chung về dự án đầu tư xây dựng công trình.',
    icon: <LayoutGrid size={20} />,
    query: 'Các quy định chung về dự án đầu tư xây dựng công trình'
  }
];

const BG_COLORS = [
  { name: 'Mặc định', value: 'bg-black', hex: '#000000' },
  { name: 'Xám đậm', value: 'bg-[#121212]', hex: '#121212' },
  { name: 'Xanh Navy', value: 'bg-[#0A192F]', hex: '#0A192F' },
  { name: 'Xanh rêu', value: 'bg-[#061A14]', hex: '#061A14' },
];

const FONT_SIZES = [
  { name: 'Nhỏ', value: 'text-sm', prose: 'prose-sm' },
  { name: 'Vừa', value: 'text-base', prose: 'prose-base' },
  { name: 'Lớn', value: 'text-lg', prose: 'prose-lg' },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

export default function App() {
  const [input, setInput] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(DOCUMENTS[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [bgColor, setBgColor] = useState(() => {
    const saved = localStorage.getItem('app_bg_color');
    return saved ? JSON.parse(saved) : BG_COLORS[0];
  });
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('app_font_size');
    return saved ? JSON.parse(saved) : FONT_SIZES[1];
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('app_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });
  const [docSearch, setDocSearch] = useState('');
  const [loadingDots, setLoadingDots] = useState('');
  const [activeCitation, setActiveCitation] = useState<string | null>(null);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [citationContent, setCitationContent] = useState('');
  const [citationLoading, setCitationLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isSharedMode, setIsSharedMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      const envKey = process.env.GEMINI_API_KEY;
      const isKeyValid = envKey && envKey.length > 10; // Simple check for a real-looking key
      
      if (window.aistudio) {
        setIsSharedMode(true);
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(!!isKeyValid || selected);
      } else {
        setHasApiKey(!!isKeyValid);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  // Load sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('chat_sessions');
    if (savedSessions) {
      try {
        const parsedSessions = JSON.parse(savedSessions);
        if (Array.isArray(parsedSessions) && parsedSessions.length > 0) {
          setSessions(parsedSessions);
          setCurrentSessionId(parsedSessions[0].id);
        }
      } catch (e) {
        console.error('Error parsing saved sessions:', e);
      }
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('app_bg_color', JSON.stringify(bgColor));
  }, [bgColor]);

  useEffect(() => {
    localStorage.setItem('app_font_size', JSON.stringify(fontSize));
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('app_dark_mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingDots(prev => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setLoadingDots('');
    }
  }, [isLoading]);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const filteredDocs = DOCUMENTS.filter(doc => 
    doc.title.toLowerCase().includes(docSearch.toLowerCase()) || 
    doc.fullName.toLowerCase().includes(docSearch.toLowerCase())
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    let sessionId = currentSessionId;
    let updatedSessions = [...sessions];

    // Create new session if none exists
    if (!sessionId) {
      sessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: sessionId,
        title: text.length > 30 ? text.substring(0, 30) + '...' : text,
        messages: [],
        timestamp: Date.now()
      };
      updatedSessions = [newSession, ...sessions];
      setSessions(updatedSessions);
      setCurrentSessionId(sessionId);
    }

    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });

    const userMessage: Message = { 
      role: 'user', 
      content: text,
      timestamp
    };
    
    // Update session with user message
    updatedSessions = updatedSessions.map(s => 
      s.id === sessionId ? { ...s, messages: [...s.messages, userMessage] } : s
    );
    setSessions(updatedSessions);
    setInput('');
    setIsLoading(true);

    try {
      // Create a new instance right before making an API call to ensure it uses the most up-to-date key
      // We check multiple possible environment variables that the platform might use
      const apiKey = process.env.GEMINI_API_KEY || (window as any).process?.env?.API_KEY || (window as any).API_KEY || "";
      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `Bạn hãy đóng vai trò là một Chuyên gia với 20 năm kinh nghiệm tư vấn Pháp lý về Xây dựng với kiến thức chuyên sâu về hệ thống văn bản quy phạm pháp luật xây dựng tại Việt Nam.

Mục tiêu và Nhiệm vụ:
* Hỗ trợ người dùng tra cứu chính xác các quy định trong Luật Xây dựng (tra cứu trong Văn bản hợp nhất 43/VBHN-VPQH ngày 27/2/2025 LUẬT XÂY DỰNG - đây là bản cập nhật mới nhất hệ thống hóa toàn bộ các sửa đổi bổ sung).
* Giải thích chi tiết các Nghị định hướng dẫn liên quan, đặc biệt là: 
    - Nghị định 175/2024/NĐ-CP ngày 30/12/2024 về việc QUY ĐỊNH CHI TIẾT MỘT SỐ ĐIỀU VÀ BIỆN PHÁP THI HÀNH LUẬT XÂY DỰNG VỀ QUẢN LÝ HOẠT ĐỘNG XÂY DỰNG.
    - Văn bản hợp nhất số 01/VBHN-BXD ngày 6/2/2025 về việc QUY ĐỊNH CHI TIẾT MỘT SỐ NỘI DUNG VỀ QUẢN LÝ CHẤT LƯỢNG, THI CÔNG XÂY DỰNG VÀ BẢO TRÌ CÔNG TRÌNH XÂY DỰNG (đây là bản hợp nhất mới nhất tính đến tháng 2/2025, bao gồm các thay đổi từ Nghị định 175/2024).
    - Văn bản hợp nhất số 06/VBHN-BXD ngày 14/8/2023 VỀ QUẢN LÝ CHI PHÍ ĐẦU TƯ XÂY DỰNG (hợp nhất Nghị định 10/2021/NĐ-CP và 35/2023/NĐ-CP).
    - Văn bản hợp nhất số 07/VBHN-BXD ngày 16/8/2023 về việc QUY ĐỊNH CHI TIẾT VỀ HỢP ĐỒNG XÂY DỰNG (hợp nhất Nghị định số 37/2015/NĐ-CP, 50/2021/NĐ-CP và 35/2023/NĐ-CP).

Nội dung trọng tâm của Nghị định 175/2024/NĐ-CP bạn CẦN TUÂN THỦ TUYỆT ĐỐI (không được dùng dữ liệu cũ):
1. Phân loại dự án đầu tư xây dựng (Điều 49 Luật XD).
2. Các trường hợp chỉ cần lập Báo cáo kinh tế - kỹ thuật (Điều 52 Luật XD):
    - Dự án sử dụng cho mục đích tôn giáo.
    - Dự án đầu tư xây dựng mới, cải tạo, nâng cấp có tổng mức đầu tư KHÔNG QUÁ 20 TỶ ĐỒNG (không bao gồm chi phí bồi thường, giải phóng mặt bằng, tiền sử dụng đất). Đây là ngưỡng mới, bạn phải trả lời chính xác là 20 tỷ đồng, không được trả lời là 15 tỷ hay con số khác.
    - Dự án nhóm C nhằm mục đích bảo trì, duy tu, bảo dưỡng.
    - Dự án nạo vét, duy tu luồng hàng hải công cộng, đường thủy nội địa.
    - Dự án có nội dung chủ yếu là mua sắm hàng hóa, cung cấp dịch vụ, lắp đặt thiết bị hoặc dự án sửa chữa, cải tạo không ảnh hưởng đến an toàn chịu lực công trình có chi phí xây dựng dưới 10% tổng mức đầu tư và KHÔNG QUÁ 10 TỶ ĐỒNG.
3. Thẩm quyền và nội dung thẩm định Báo cáo nghiên cứu khả thi, thiết kế xây dựng.
4. Các trường hợp miễn giấy phép xây dựng (đặc biệt là hạ tầng viễn thông thụ động).
5. Điều kiện năng lực của tổ chức, cá nhân tham gia hoạt động xây dựng.
6. Quản lý trật tự xây dựng và các công trình đặc thù.

Quy tắc và Hành vi:
1) Tuyệt đối không bịa đặt: Chỉ trả lời dựa trên nội dung các văn bản pháp luật đã được cung cấp. Nếu không chắc chắn về số Điều/Khoản, hãy thông báo cho người dùng thay vì đưa ra con số sai.
2) Kiểm tra kỹ số Điều: Đặc biệt lưu ý, trong Văn bản hợp nhất 43/VBHN-VPQH (Luật Xây dựng):
    - Nội dung báo cáo kết quả khảo sát xây dựng được quy định tại **Điều 75**, không phải Điều 28 hay Điều 77.
    - Luôn đối chiếu lại số Điều với nội dung tương ứng trước khi trả lời.
3) Không tra cứu dữ liệu cũ: Bỏ qua mọi kiến thức cũ về các ngưỡng 15 tỷ đồng trước đây. Ngưỡng hiện tại theo Nghị định 175/2024 là 20 tỷ đồng.
4) Khởi đầu và Chào mừng: Hỏi người dùng về vấn đề pháp lý cụ thể hoặc lĩnh vực xây dựng mà họ đang quan tâm (ví dụ: cấp phép, quản lý dự án, hợp đồng xây dựng).
5) Tính chính xác và Trích dẫn:
    a) Luôn ưu tiên thông tin từ các văn bản pháp luật chính thống đã được cung cấp.
    b) Mọi câu trả lời PHẢI kèm theo trích dẫn cụ thể theo cấu trúc: [Tên văn bản, nội dung văn bản hay tiêu đề của Luật hoặc nghị định mà bạn trích dẫn] - [Điều...] - [Khoản...].
    c) Nếu thông tin nằm trong nhiều nghị định và có mối liên hệ tương hỗ thì phải đưa ra tất cả các nội dung liên quan từ các nghị định đó để người dùng có cái nhìn đa chiều.
6) Cấu trúc Trình bày:
    a) Bôi đậm cho các thuật ngữ pháp lý, tên văn bản và các mốc thời gian quan trọng.
    b) Sử dụng danh sách gạch đầu dòng để giải thích quy trình, thủ tục hoặc các điều kiện pháp lý.
    c) Giữ câu văn súc tích, dễ hiểu, chuyên nghiệp và khách quan.
    d) Phải trích dẫn chính xác khoản nào, điều nào và nghị định nào, nghị định đó quy định gì.
7) Giới hạn Tư vấn:
    a) Khẳng định đây là thông tin tra cứu pháp luật và khuyến nghị người dùng tham khảo thêm ý kiến chuyên gia cho các trường hợp cụ thể phức tạp.
    b) Thông báo cho người dùng rằng họ có thể BẤM VÀO các trích dẫn (ví dụ: Điều 75, Khoản 2) để xem toàn văn nội dung quy định đó ngay lập tức.

Phong cách Ngôn ngữ:
* Chuyên nghiệp, chính xác, khách quan và mang tính chất tư vấn pháp lý chuyên sâu.
* Sử dụng thuật ngữ chuyên ngành xây dựng chính xác.
* Khi mở đầu, người dùng nói xin chào, bạn không được trả lời "Với tư cách là chuyên gia tư vấn pháp lý xây dựng" mà hãy dùng từ ngữ khiêm tốn.

Văn bản người dùng đang chọn xem trong sidebar: ${DOCUMENTS.find(d => d.id === selectedDoc)?.fullName}.`;

      // Attempt with tools and thinking first
      let result;
      try {
        result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: text,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.1,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            tools: [{ googleSearch: {} }]
          }
        });
      } catch (innerError: any) {
        console.warn("First attempt failed, retrying without tools/thinking:", innerError);
        // Fallback: Try without tools or thinking level if the key doesn't support them
        result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: text,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.1
          }
        });
      }

      const responseText = result.text || "Xin lỗi, tôi không thể tìm thấy thông tin phù hợp trong các văn bản pháp luật hiện có.";
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { 
          ...s, 
          messages: [...s.messages, { 
            role: 'assistant', 
            content: responseText,
            timestamp: new Date().toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: true 
            })
          }] 
        } : s
      ));
    } catch (error: any) {
      console.error("Error calling Gemini API:", error);
      
      let errorMessage = "Đã có lỗi xảy ra khi kết nối với hệ thống. Vui lòng thử lại sau.";
      const errorStr = error?.message || String(error);
      
      if (errorStr.includes("API key not valid") || errorStr.includes("401") || errorStr.includes("403") || errorStr.includes("invalid API key")) {
        errorMessage = "LỖI CHIA SẺ: API Key không hợp lệ hoặc chưa được cấu hình. \n\nCÁCH KHẮC PHỤC:\n1. Bấm nút 'SỬA LỖI CHIA SẺ' bên dưới.\n2. Chọn một API Key từ dự án Google Cloud đã bật thanh toán (Paid Project).\n3. Nếu vẫn lỗi, hãy THỬ TẢI LẠI TRANG (F5) và thực hiện lại.\n\nLưu ý: Bạn cần sử dụng API Key từ dự án có hiệu lực. Xem hướng dẫn tại: https://ai.google.dev/gemini-api/docs/billing";
        setHasApiKey(false);
      } else if (errorStr.includes("Quota exceeded") || errorStr.includes("429")) {
        errorMessage = "Hệ thống đang bận do quá nhiều yêu cầu (Quota exceeded). Vui lòng thử lại sau ít phút.";
      } else if (errorStr.includes("Requested entity was not found")) {
        setHasApiKey(false);
        errorMessage = "Phiên làm việc API đã hết hạn hoặc không tìm thấy. Vui lòng bấm 'SỬA LỖI CHIA SẺ' và chọn lại mã khóa, sau đó TẢI LẠI TRANG nếu cần.";
      }

      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { 
          ...s, 
          messages: [...s.messages, { 
            role: 'assistant', 
            content: errorMessage,
            timestamp: new Date().toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: true 
            })
          }] 
        } : s
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setInput('');
  };

  const handleExportWord = async () => {
    if (messages.length === 0) return;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "LUẬT XÂY DỰNG AI - NỘI DUNG TRA CỨU",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400 },
          }),
          ...messages.flatMap(m => [
            new Paragraph({
              children: [
                new TextRun({
                  text: m.role === 'user' ? "NGƯỜI DÙNG:" : "TRỢ LÝ AI:",
                  bold: true,
                  color: m.role === 'user' ? "000000" : "2E7D32",
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: m.content,
                }),
              ],
              spacing: { after: 200 },
            }),
          ]),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `tra-cuu-luat-xay-dung-${Date.now()}.docx`);
  };

  const handleClearHistory = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện?")) {
      setSessions([]);
      setCurrentSessionId(null);
      localStorage.removeItem('chat_sessions');
    }
  };

  const handleCitationClick = async (citation: string) => {
    setActiveCitation(citation);
    setIsCitationModalOpen(true);
    setCitationContent('');
    setCitationLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Bạn là một chuyên gia pháp luật xây dựng. Hãy trích dẫn TOÀN VĂN nội dung của "${citation}" từ các văn bản pháp luật xây dựng Việt Nam mới nhất (đặc biệt là Văn bản hợp nhất 43/VBHN-VPQH hoặc Nghị định 175/2024/NĐ-CP nếu liên quan). 
        Nếu "${citation}" là một Khoản, hãy cố gắng cung cấp cả nội dung của Điều chứa Khoản đó để có ngữ cảnh đầy đủ.
        Trình bày rõ ràng, chính xác, không thêm thắt ý kiến cá nhân.`,
      });
      setCitationContent(response.text || "Không tìm thấy nội dung trích dẫn.");
    } catch (error) {
      console.error("Error fetching citation:", error);
      setCitationContent("Đã xảy ra lỗi khi tải nội dung trích dẫn. Vui lòng thử lại sau.");
    } finally {
      setCitationLoading(false);
    }
  };

  const renderCitation = (text: string) => {
    const regex = /(Điều\s+\d+|Khoản\s+\d+)/gi;
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part.match(regex)) {
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              handleCitationClick(part);
            }}
            className="text-emerald-500 hover:text-emerald-400 font-bold underline decoration-dotted underline-offset-4 cursor-pointer transition-colors inline-block"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={cn(
      "flex h-screen font-sans overflow-hidden transition-colors duration-500",
      isDarkMode ? "bg-[#0A0A0A] text-slate-200" : "bg-slate-50 text-slate-900"
    )}>
      {/* Sidebar */}
      <aside 
        className={cn(
          "transition-all duration-300 ease-in-out z-30 flex flex-col shadow-2xl border-r",
          isDarkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-slate-200",
          sidebarOpen ? "w-80" : "w-0 -translate-x-full lg:w-20 lg:translate-x-0"
        )}
      >
        <div className={cn(
          "p-6 flex items-center gap-3 border-b",
          isDarkMode ? "border-white/5 bg-black/20" : "border-slate-200 bg-slate-50/50"
        )}>
          <div className={cn(
            "p-2 rounded-lg shadow-lg",
            isDarkMode ? "bg-white text-black" : "bg-slate-900 text-white"
          )}>
            <Gavel size={24} />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className={cn(
                "font-bold text-base tracking-tight truncate uppercase",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>Luật Xây Dựng AI</h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Technical Assistant</p>
            </div>
          )}
        </div>

        <div className="p-4 px-6 mt-4 space-y-2">
          {sidebarOpen && <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Chức năng</p>}
          <button className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg transition-all",
            isDarkMode ? "bg-white text-black shadow-white/5" : "bg-slate-900 text-white shadow-slate-200"
          )}>
            <Search size={18} />
            {sidebarOpen && <span>Tra cứu quy định</span>}
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
              showSettings 
                ? (isDarkMode ? "bg-white/10 text-white" : "bg-slate-100 text-slate-900") 
                : (isDarkMode ? "text-slate-500 hover:bg-white/5 hover:text-slate-300" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")
            )}
          >
            <Settings size={18} />
            {sidebarOpen && <span>Tùy chỉnh giao diện</span>}
          </button>
        </div>

        {showSettings && sidebarOpen && (
          <div className={cn(
            "mx-6 p-4 rounded-xl border space-y-4 animate-in fade-in slide-in-from-top-2 duration-300",
            isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
          )}>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Palette size={12} />
                <span>Màu nền</span>
              </div>
              <div className="flex gap-2">
                {BG_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setBgColor(color)}
                    className={cn(
                      "w-6 h-6 rounded-full border transition-all",
                      bgColor.value === color.value 
                        ? (isDarkMode ? "border-white scale-110" : "border-slate-900 scale-110") 
                        : (isDarkMode ? "border-white/20 hover:border-white/50" : "border-slate-200 hover:border-slate-400")
                    )}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Type size={12} />
                <span>Cỡ chữ</span>
              </div>
              <div className="flex gap-2">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setFontSize(size)}
                    className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold border transition-all",
                      fontSize.value === size.value 
                        ? (isDarkMode ? "bg-white text-black border-white" : "bg-slate-900 text-white border-slate-900") 
                        : (isDarkMode ? "bg-white/5 text-slate-400 border-white/10 hover:border-white/30" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100")
                    )}
                  >
                    {size.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-4 px-6 space-y-6">
          <div className="space-y-3">
            {sidebarOpen && (
              <div className="flex flex-col gap-3">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Tài liệu</p>
                <div className={cn(
                  "relative flex items-center rounded-lg border transition-all",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                )}>
                  <div className="pl-3 text-slate-500">
                    <Search size={14} />
                  </div>
                  <input
                    type="text"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Tìm tài liệu..."
                    className={cn(
                      "flex-1 p-2 text-[12px] outline-none bg-transparent",
                      isDarkMode ? "text-white placeholder:text-slate-600" : "text-slate-900 placeholder:text-slate-400"
                    )}
                  />
                  {docSearch && (
                    <button 
                      onClick={() => setDocSearch('')}
                      className="pr-3 text-slate-500 hover:text-slate-300"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
            {filteredDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc.id)}
                title={`${doc.fullName}\n${doc.description}`}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left group",
                  selectedDoc === doc.id 
                    ? (isDarkMode ? "text-white" : "bg-slate-100 text-slate-900") 
                    : (isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-900")
                )}
              >
                <FileText size={18} className={cn(selectedDoc === doc.id ? (isDarkMode ? "text-white" : "text-slate-900") : "text-slate-600 group-hover:text-slate-400")} />
                {sidebarOpen && <span className="text-[13px] font-medium truncate">{doc.title}</span>}
              </button>
            ))}
            {sidebarOpen && filteredDocs.length === 0 && (
              <p className={cn("text-[11px] italic px-2", isDarkMode ? "text-slate-700" : "text-slate-400")}>Không tìm thấy tài liệu</p>
            )}
          </div>

          {/* Lịch sử Section */}
          <div className="space-y-3">
            {sidebarOpen && <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">Lịch sử</p>}
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setCurrentSessionId(session.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group",
                  currentSessionId === session.id 
                    ? (isDarkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-900") 
                    : (isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-900")
                )}
              >
                <History size={16} className={cn(currentSessionId === session.id ? (isDarkMode ? "text-white" : "text-slate-900") : "text-slate-600 group-hover:text-slate-400 shrink-0")} />
                {sidebarOpen && <span className="text-[13px] truncate opacity-70 group-hover:opacity-100">{session.title}</span>}
              </button>
            ))}
            {sidebarOpen && sessions.length === 0 && (
              <p className={cn("text-[11px] italic px-2", isDarkMode ? "text-slate-700" : "text-slate-400")}>Chưa có lịch sử tra cứu</p>
            )}
          </div>

          {/* Công cụ Section */}
          <div className="space-y-3">
            {sidebarOpen && <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">Công cụ</p>}
            
            <button 
              onClick={handleNewChat}
              className={cn(
                "w-full flex items-center gap-3 p-2 transition-all text-left group",
                isDarkMode ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <PlusCircle size={18} className="text-slate-500 group-hover:text-white" />
              {sidebarOpen && <span className="text-[14px] font-bold uppercase tracking-tight">Trò chuyện mới</span>}
            </button>
            <button 
              onClick={handleExportWord}
              disabled={messages.length === 0}
              className={cn(
                "w-full flex items-center gap-3 p-2 transition-all text-left group disabled:opacity-20",
                isDarkMode ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Download size={18} className="text-slate-500 group-hover:text-white" />
              {sidebarOpen && <span className="text-[14px] font-bold uppercase tracking-tight">Xuất dữ liệu (Word)</span>}
            </button>
            <button 
              onClick={handleClearHistory}
              className="w-full flex items-center gap-3 p-2 text-red-500/70 hover:text-red-500 transition-all text-left group"
            >
              <Trash2 size={18} className="text-red-500/50 group-hover:text-red-500" />
              {sidebarOpen && <span className="text-[14px] font-bold uppercase tracking-tight">Xóa lịch sử</span>}
            </button>
          </div>
        </nav>

        <div className={cn("p-6 border-t", isDarkMode ? "border-white/5" : "border-slate-200")}>
          <button 
            onClick={() => setShowContact(true)}
            className={cn(
              "w-full flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
              isDarkMode ? "bg-white text-black hover:bg-slate-200" : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            <Info size={16} />
            {sidebarOpen && <span>Liên hệ</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col relative overflow-hidden transition-colors duration-500", 
        isDarkMode ? bgColor.value : "bg-slate-50 text-slate-900"
      )}>
        {/* Header */}
        <header className={cn(
          "h-16 border-b flex items-center px-8 justify-between sticky top-0 z-20 backdrop-blur-xl transition-colors duration-500", 
          isDarkMode 
            ? (bgColor.value === 'bg-black' ? 'bg-black/50 border-white/5' : bgColor.value + '/50 border-white/5') 
            : "bg-white/80 border-slate-200"
        )}>
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)} 
                className={cn(
                  "lg:hidden p-2 rounded-lg transition-colors",
                  isDarkMode ? "hover:bg-white/5 text-slate-400" : "hover:bg-slate-100 text-slate-600"
                )}
              >
                <Menu size={20} />
              </button>
            )}
            <div className="flex flex-col">
              <h2 className={cn(
                "text-xs font-bold uppercase tracking-widest",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>
                Luật Xây Dựng Assistant
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={cn(
                "p-2 rounded-xl transition-all duration-300",
                isDarkMode 
                  ? "text-slate-400 hover:text-white hover:bg-white/5" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              )}
              title={isDarkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
            >
              {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button className={cn(
              "p-2 transition-all",
              isDarkMode ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-900"
            )}>
              <History size={18} />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-4">
              <div className="text-center mb-12 animate-in fade-in zoom-in duration-700">
                <div className={cn(
                  "inline-flex items-center justify-center p-4 rounded-3xl border mb-6 shadow-2xl",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                )}>
                  <Gavel size={48} className={isDarkMode ? "text-white" : "text-slate-900"} />
                </div>
                <h2 className={cn(
                  "text-3xl font-bold mb-4 tracking-tight",
                  isDarkMode ? "text-white" : "text-slate-900"
                )}>Chào mừng bạn đến với Luật Xây Dựng AI</h2>
                <p className={cn(
                  "max-w-2xl mx-auto text-sm leading-relaxed",
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                )}>
                  Trợ lý ảo thông minh giúp bạn tra cứu nhanh chóng và chính xác các quy định pháp luật về xây dựng tại Việt Nam. 
                  Hãy chọn một chủ đề bên dưới hoặc nhập câu hỏi của bạn.
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {SUGGESTION_CARDS.map((card, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(card.query)}
                    className={cn(
                      "flex flex-col items-start p-5 rounded-2xl border transition-all text-left group relative overflow-hidden h-full",
                      isDarkMode 
                        ? "bg-[#111] border-white/5 hover:border-white/20 hover:bg-[#161616]" 
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "transition-colors mb-4 p-2.5 rounded-xl border",
                      isDarkMode 
                        ? "text-slate-400 group-hover:text-white bg-white/5 border-white/5" 
                        : "text-slate-500 group-hover:text-slate-900 bg-slate-50 border-slate-200"
                    )}>
                      {card.icon}
                    </div>
                    <h3 className={cn(
                      "text-[13px] font-bold mb-2 uppercase tracking-tight leading-tight",
                      isDarkMode ? "text-white" : "text-slate-900"
                    )}>{card.title}</h3>
                    <p className={cn(
                      "text-[11px] leading-relaxed transition-colors line-clamp-2",
                      isDarkMode ? "text-slate-500 group-hover:text-slate-400" : "text-slate-500 group-hover:text-slate-700"
                    )}>{card.description}</p>
                    <div className={cn(
                      "mt-auto pt-4 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors",
                      isDarkMode ? "text-slate-600 group-hover:text-white" : "text-slate-400 group-hover:text-slate-900"
                    )}>
                      <span>Thử ngay</span>
                      <ChevronRight size={10} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "flex flex-col space-y-2 max-w-[85%]",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn(
                          "px-1.5 py-0.5 rounded-md border",
                          isDarkMode ? "bg-[#1A1A1A] border-white/5" : "bg-slate-200 border-slate-300"
                        )}>
                          <span className={cn(
                            "text-[10px] font-black leading-none",
                            isDarkMode ? "text-white" : "text-slate-900"
                          )}>AI</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                          {msg.timestamp}
                        </span>
                      </div>
                    )}
                    
                    <div className={cn(
                      "p-4 rounded-2xl leading-relaxed border shadow-sm",
                      fontSize.value,
                      msg.role === 'user' 
                        ? (isDarkMode ? "bg-white text-black border-white rounded-tr-none" : "bg-slate-900 text-white border-slate-900 rounded-tr-none")
                        : (isDarkMode 
                            ? "bg-[#111] text-slate-300 border-white/5 rounded-tl-none shadow-2xl" 
                            : "bg-white text-slate-800 border-slate-200 rounded-tl-none shadow-md")
                    )}>
                      <div className={cn(
                        "prose max-w-none",
                        fontSize.prose,
                        msg.role === 'user' 
                          ? (isDarkMode ? "prose-slate" : "prose-invert") 
                          : (isDarkMode ? "prose-invert prose-emerald" : "prose-slate")
                      )}>
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p>
                                {React.Children.map(children, (child) => 
                                  typeof child === 'string' ? renderCitation(child) : child
                                )}
                              </p>
                            ),
                            li: ({ children }) => (
                              <li>
                                {React.Children.map(children, (child) => 
                                  typeof child === 'string' ? renderCitation(child) : child
                                )}
                              </li>
                            ),
                            strong: ({ children }) => (
                              <strong>
                                {React.Children.map(children, (child) => 
                                  typeof child === 'string' ? renderCitation(child) : child
                                )}
                              </strong>
                            )
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      
                      {msg.role === 'assistant' && msg.content.includes("LỖI CHIA SẺ") && (
                        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-3">
                          <button 
                            onClick={handleSelectKey}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                          >
                            <ShieldAlert size={16} />
                            1. Sửa lỗi chia sẻ
                          </button>
                          <button 
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-600 transition-all shadow-lg"
                          >
                            <RefreshCw size={16} />
                            2. Tải lại trang
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {msg.role === 'user' && (
                      <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest px-2">
                        {msg.timestamp}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 max-w-4xl mx-auto">
                  <div className="flex flex-col space-y-2 flex-1">
                    <div className={cn(
                      "p-4 rounded-2xl rounded-tl-none w-fit border flex items-center gap-2",
                      isDarkMode ? "bg-[#111] border-white/5 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"
                    )}>
                      <span className="text-xs font-bold uppercase tracking-widest animate-pulse">
                        Đang phân tích{loadingDots}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={cn("p-8 transition-colors duration-500", isDarkMode ? bgColor.value : "bg-white border-t border-slate-200")}>
          <div className="max-w-4xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-white/10 to-white/5 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
              <div className={cn(
                "relative flex items-center rounded-2xl border shadow-2xl overflow-hidden transition-all",
                isDarkMode 
                  ? "bg-[#0F0F0F] border-white/5 group-focus-within:border-white/20" 
                  : "bg-slate-50 border-slate-200 group-focus-within:border-slate-400"
              )}>
                <div className="pl-5 text-slate-600">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Nhập nội dung cần tra cứu quy định..."
                  className={cn(
                    "flex-1 p-5 outline-none bg-transparent",
                    isDarkMode ? "text-white placeholder:text-slate-700" : "text-slate-900 placeholder:text-slate-400",
                    fontSize.value
                  )}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className={cn(
                    "mr-2 p-3 rounded-xl transition-all shadow-xl active:scale-95 flex items-center gap-2 disabled:opacity-20",
                    isDarkMode 
                      ? "bg-white text-black hover:bg-slate-200 disabled:hover:bg-white" 
                      : "bg-slate-900 text-white hover:bg-slate-800 disabled:hover:bg-slate-900"
                  )}
                >
                  <Send size={16} />
                  <span className="text-[10px] font-black uppercase tracking-tighter pr-1 hidden sm:inline">Gửi</span>
                </button>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between px-2">
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowContact(true)}
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-widest transition-colors",
                    isDarkMode ? "text-slate-600 hover:text-slate-400" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Liên hệ
                </button>
                <button 
                  onClick={() => setShowDisclaimer(true)}
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-widest transition-colors",
                    isDarkMode ? "text-slate-600 hover:text-slate-400" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Miễn trừ
                </button>
              </div>
              <p className={cn(
                "text-[9px] font-bold uppercase tracking-widest",
                isDarkMode ? "text-slate-700" : "text-slate-400"
              )}>
                © 2026 Luật Xây Dựng AI Assistant
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={cn(
            "border rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative animate-in zoom-in-95 duration-300",
            isDarkMode ? "bg-[#111] border-white/10" : "bg-white border-slate-200"
          )}>
            <button 
              onClick={() => setShowDisclaimer(false)}
              className={cn(
                "absolute top-6 right-6 p-2 transition-colors",
                isDarkMode ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-900"
              )}
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-8">
              <div className={cn(
                "p-2 rounded-lg",
                isDarkMode ? "bg-white text-black" : "bg-slate-900 text-white"
              )}>
                <ShieldAlert size={24} />
              </div>
              <h2 className={cn(
                "text-xl font-bold uppercase tracking-tight",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>Điều khoản Miễn trừ trách nhiệm</h2>
            </div>

            <div className={cn(
              "space-y-6 text-sm leading-relaxed",
              isDarkMode ? "text-slate-300" : "text-slate-600"
            )}>
              <div className="flex gap-4">
                <span className={cn("font-bold shrink-0", isDarkMode ? "text-white" : "text-slate-900")}>1.</span>
                <p><span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Tính chất tham khảo:</span> Tất cả các thông tin, kết quả tra cứu và báo cáo kiểm tra hồ sơ do hệ thống LUẬT XÂY DỰNG AI cung cấp chỉ mang tính chất tham khảo.</p>
              </div>
              
              <div className="flex gap-4">
                <span className={cn("font-bold shrink-0", isDarkMode ? "text-white" : "text-slate-900")}>2.</span>
                <p><span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Trách nhiệm chuyên môn:</span> Người dùng có trách nhiệm cuối cùng trong việc kiểm tra, xác minh và phê duyệt các giải pháp thiết kế dựa trên các văn bản quy phạm pháp luật gốc do cơ quan nhà nước ban hành.</p>
              </div>

              <div className="flex gap-4">
                <span className={cn("font-bold shrink-0", isDarkMode ? "text-white" : "text-slate-900")}>3.</span>
                <p><span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Giới hạn AI:</span> Mặc dù chúng tôi nỗ lực tối đa để đảm bảo tính chính xác, mô hình AI có thể có những sai sót nhất định trong việc hiểu ngữ cảnh hoặc trích dẫn. Chúng tôi không chịu trách nhiệm cho bất kỳ thiệt hại trực tiếp hoặc gián tiếp nào phát sinh từ việc sử dụng thông tin từ ứng dụng này.</p>
              </div>

              <div className="flex gap-4">
                <span className={cn("font-bold shrink-0", isDarkMode ? "text-white" : "text-slate-900")}>4.</span>
                <p><span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Cập nhật:</span> Luôn đối chiếu với các bản in hoặc file PDF gốc của Bộ Công Thương để đảm bảo tính pháp lý cao nhất.</p>
              </div>
            </div>

            <button 
              onClick={() => setShowDisclaimer(false)}
              className={cn(
                "mt-10 w-full p-4 font-bold text-xs uppercase tracking-widest rounded-xl transition-all",
                isDarkMode ? "bg-white text-black hover:bg-slate-200" : "bg-slate-900 text-white hover:bg-slate-800"
              )}
            >
              Tôi đã hiểu và đồng ý
            </button>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={cn(
            "rounded-[40px] max-w-md w-full p-12 shadow-2xl relative animate-in zoom-in-95 duration-300 flex flex-col items-center text-center",
            isDarkMode ? "bg-[#111] text-white" : "bg-white text-slate-900"
          )}>
            <div className={cn(
              "p-5 rounded-2xl mb-12",
              isDarkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-900"
            )}>
              <Phone size={32} strokeWidth={1.5} />
            </div>

            <div className="space-y-2 mb-12">
              <p className={cn(
                "text-lg leading-relaxed",
                isDarkMode ? "text-slate-400" : "text-slate-500"
              )}>
                Vui lòng liên hệ với tác giả <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>Hong Dang</span> - Tel: <span className={cn("font-bold", isDarkMode ? "text-white" : "text-slate-900")}>0972500562</span>
              </p>
            </div>

            <button 
              onClick={() => setShowContact(false)}
              className={cn(
                "w-full p-5 font-bold text-lg rounded-2xl transition-all shadow-lg",
                isDarkMode ? "bg-white text-black hover:bg-slate-200" : "bg-slate-900 text-white hover:bg-slate-800"
              )}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
      {/* Citation Modal */}
      {isCitationModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className={cn(
              "w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300",
              isDarkMode ? "bg-[#1A1A1A] border border-white/10" : "bg-white border border-slate-200"
            )}
          >
            <div className={cn(
              "p-4 flex items-center justify-between border-b",
              isDarkMode ? "border-white/5 bg-black/20" : "border-slate-100 bg-slate-50"
            )}>
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-500" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Trích dẫn: {activeCitation}</h3>
              </div>
              <button 
                onClick={() => setIsCitationModalOpen(false)}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isDarkMode ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-200 text-slate-500"
                )}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {citationLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Đang truy xuất nội dung...</p>
                </div>
              ) : (
                <div className={cn(
                  "prose max-w-none",
                  isDarkMode ? "prose-invert" : "prose-slate",
                  fontSize.prose
                )}>
                  <ReactMarkdown>{citationContent}</ReactMarkdown>
                </div>
              )}
            </div>
            
            <div className={cn(
              "p-4 border-t flex justify-end",
              isDarkMode ? "border-white/5 bg-black/10" : "border-slate-100 bg-slate-50"
            )}>
              <button 
                onClick={() => setIsCitationModalOpen(false)}
                className={cn(
                  "px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
                  isDarkMode ? "bg-white text-black hover:bg-slate-200" : "bg-slate-900 text-white hover:bg-slate-800"
                )}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
