'use client';

import { useState } from 'react';
import { Search, Loader2, Code, Copy, Check } from 'lucide-react';
import { scrapeStoryInfo, scrapeChapterContent, generateScrapingPrompt, StoryInfo, ChapterData } from '@/app/actions';

export default function ScraperUI() {
  const [url, setUrl] = useState('https://welove-gourmet.com/book/130970');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [storyInfo, setStoryInfo] = useState<StoryInfo | null>(null);
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleScrapeInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setIsLoadingInfo(true);
    setError('');
    setStoryInfo(null);
    setChapterData(null);
    setGeneratedPrompt('');
    
    try {
      const info = await scrapeStoryInfo(url);
      setStoryInfo(info);
      
      if (info.chapters && info.chapters.length > 0) {
        setIsLoadingChapter(true);
        try {
          const firstChap = await scrapeChapterContent(info.chapters[0].url);
          setChapterData(firstChap);
        } catch (err) {
          console.error("Failed to load first chapter automatically:", err);
        } finally {
          setIsLoadingChapter(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lấy thông tin truyện');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handleGeneratePrompt = async () => {
    if (!url || !storyInfo) return;
    
    setIsGeneratingPrompt(true);
    setError('');
    
    try {
      const promptText = await generateScrapingPrompt(url);
      setGeneratedPrompt(promptText);
    } catch (err: any) {
       setError(err.message || 'Lỗi khi tạo AI Prompt');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleCopyPrompt = () => {
    if (generatedPrompt) {
      navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReadChapter = async (chapterUrl: string) => {
    setIsLoadingChapter(true);
    setError('');
    
    try {
      const data = await scrapeChapterContent(chapterUrl);
      setChapterData(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải nội dung chương');
    } finally {
      setIsLoadingChapter(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#fcfaf7] text-[#1a1a1a] font-sans overflow-hidden">
      <nav className="h-16 border-b border-[#1a1a1a]/10 flex items-center px-4 sm:px-8 bg-white/50 backdrop-blur-sm z-10 shrink-0">
        <div className="hidden sm:block flex-none mr-12">
          <span className="font-serif italic text-2xl tracking-tighter">ChomeScanner</span>
        </div>
        <form onSubmit={handleScrapeInfo} className="flex-1 flex max-w-3xl items-center bg-[#f0ede8] rounded-full px-4 py-2 border border-[#1a1a1a]/5">
          <Search className="w-4 h-4 text-[#1a1a1a]/40 mr-3 shrink-0" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-transparent w-full text-sm outline-none font-medium placeholder-[#1a1a1a]/30"
            placeholder="Dán link truyện vào đây..."
            required
          />
          <button
            type="submit"
            disabled={isLoadingInfo || !url}
            className="ml-4 px-4 sm:px-6 py-1.5 sm:py-2 bg-[#1a1a1a] text-white rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0 flex items-center"
          >
            {isLoadingInfo ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Đọc Thử'}
          </button>
          
          <button
            type="button"
            onClick={handleGeneratePrompt}
            disabled={isGeneratingPrompt || !storyInfo}
            className="ml-2 px-4 sm:px-6 py-1.5 sm:py-2 bg-[#f0ede8] border border-[#1a1a1a]/20 text-[#1a1a1a] rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-[#e5e1da] disabled:opacity-50 transition-opacity shrink-0 flex items-center"
          >
            {isGeneratingPrompt ? <Loader2 className="w-4 h-4 animate-spin mx-auto mr-2" /> : <Code className="w-4 h-4 mr-2" />}
            Tạo AI Prompt
          </button>
        </form>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Book Info (Only show if parsing directly) */}
        {storyInfo && !generatedPrompt && (
          <aside className="hidden lg:flex w-80 border-r border-[#1a1a1a]/10 p-8 flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar bg-[#fcfaf7]">
            <div className="aspect-[3/4] bg-[#e5e1da] rounded-lg shadow-2xl relative overflow-hidden flex items-center justify-center text-[#1a1a1a]/20 shrink-0">
              {storyInfo.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={storyInfo.coverImage} alt={storyInfo.title} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="font-serif italic text-sm z-10 relative">[ Ảnh bìa truyện ]</span>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-80 mb-1 line-clamp-1">Scanned Result</p>
                <h2 className="font-serif text-xl leading-tight line-clamp-2">{storyInfo.title}</h2>
              </div>
            </div>
            
            <div className="shrink-0">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]/40 mb-3">Thông tin chi tiết</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-baseline border-b border-[#1a1a1a]/5 pb-2">
                  <span className="text-xs text-[#1a1a1a]/50">Tác phẩm</span>
                  <span className="text-sm font-medium line-clamp-1 text-right max-w-[140px]">{storyInfo.title}</span>
                </div>
                <div className="flex justify-between items-baseline border-b border-[#1a1a1a]/5 pb-2">
                  <span className="text-xs text-[#1a1a1a]/50">Số chương</span>
                  <span className="text-sm font-medium">{storyInfo.chapters.length}</span>
                </div>
              </div>
            </div>

            <div className="mt-auto p-4 bg-[#f5f2ed] rounded-xl shrink-0">
               <p className="text-[11px] leading-relaxed italic text-[#1a1a1a]/60">
                 Dữ liệu được thu thập từ link trang được cung cấp. ChomeScanner hỗ trợ duyệt đọc nội dung văn bản thuần dễ dàng.
               </p>
            </div>
          </aside>
        )}

        {/* Middle: Reader View / Prompt View */}
        <section className="flex-1 bg-white overflow-y-auto px-6 sm:px-12 lg:px-16 py-12 custom-scrollbar relative">
          
          {/* Output Prompt Result */}
          {generatedPrompt && (
             <div className="max-w-3xl mx-auto pb-24 font-mono text-sm">
                <header className="mb-8 flex items-center justify-between">
                  <div>
                    <h1 className="font-serif text-3xl mb-2 tracking-tight">AI Scraping Prompt</h1>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/40">Cấu trúc tải cho: {url}</p>
                  </div>
                  <button 
                    onClick={handleCopyPrompt}
                    className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#1a1a1a]/80 transition-colors"
                  >
                     {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                     {copied ? 'Đã Copy' : 'Copy Prompt'}
                  </button>
                </header>
                <div className="bg-[#f0ede8] p-6 rounded-xl border border-[#1a1a1a]/10 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {generatedPrompt}
                </div>
             </div>
          )}

          {!generatedPrompt && isLoadingChapter && (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-[#1a1a1a]/20" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/40 animate-pulse">Đang tải nội dung</p>
            </div>
          )}
          
          {!generatedPrompt && !isLoadingChapter && chapterData && (
            <div className="max-w-2xl mx-auto pb-24">
              <header className="mb-12 text-center">
                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl mb-6 tracking-tight leading-tight">{chapterData.title}</h1>
                <div className="h-[1px] w-24 bg-[#1a1a1a] mx-auto mb-6 opacity-20"></div>
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/40">Đang hiển thị nội dung</p>
              </header>

              <article className="font-serif text-lg leading-relaxed text-[#2a2a2a] space-y-6">
                {chapterData.content.length > 0 ? (
                  chapterData.content.map((p, idx) => (
                    <p key={idx} className="text-justify">{p}</p>
                  ))
                ) : (
                  <p className="text-center italic opacity-50">Không thể tìm thấy nội dung chữ cho chương này.</p>
                )}
              </article>
            </div>
          )}
          
          {!generatedPrompt && !chapterData && !isLoadingChapter && (
             <div className="flex flex-col h-full items-center justify-center text-center max-w-md mx-auto px-4">
               {!storyInfo && !isLoadingInfo && !error && (
                 <>
                   <div className="w-16 h-16 rounded-full bg-[#f5f2ed] flex items-center justify-center mb-6">
                     <Search className="w-6 h-6 text-[#1a1a1a]/20" />
                   </div>
                   <h2 className="font-serif text-2xl mb-3">Phân tích cấu trúc truyện</h2>
                   <p className="text-sm text-[#1a1a1a]/60 leading-relaxed mb-6">
                     Dán link truyện vào thanh tìm kiếm. Bạn có thể <b>Đọc thử</b> ngay lập tức hoặc ấn <b>Tạo AI Prompt</b> để máy nhận diện ra cấu trúc các thẻ HTML (title, image, chapter) để bạn giao cho AI lập trình tool Crawl riêng!
                   </p>
                 </>
               )}
               {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                  </div>
               )}
             </div>
          )}
        </section>

        {/* Right: Chapter List */}
        {storyInfo && !generatedPrompt && (
          <aside className="hidden md:flex w-64 lg:w-72 bg-[#f5f2ed] border-l border-[#1a1a1a]/10 flex-col shrink-0">
            <div className="p-6 border-b border-[#1a1a1a]/10 shrink-0">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold">Danh sách chương ({storyInfo.chapters.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
              <div className="p-2 space-y-1">
                {storyInfo.chapters.map((chapter, idx) => {
                  const isActive = chapterData?.title === chapter.title;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleReadChapter(chapter.url)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        isActive 
                        ? 'bg-white border border-[#1a1a1a]/10 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]' 
                        : 'border border-transparent hover:bg-[#1a1a1a]/5'
                      }`}
                    >
                      <p className={`text-[10px] mb-0.5 ${isActive ? 'text-[#1a1a1a]/60 font-medium' : 'text-[#1a1a1a]/40'}`}>
                        Chapter {String(idx + 1).padStart(2, '0')}
                      </p>
                      <p className={`text-xs ${isActive ? 'font-bold text-[#1a1a1a]' : 'font-medium text-[#1a1a1a]/70'} line-clamp-2`}>
                        {chapter.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            {storyInfo.chapters.length > 20 && (
              <div className="p-4 border-t border-[#1a1a1a]/10 bg-white/50 text-[10px] text-center italic text-[#1a1a1a]/40 shrink-0">
                Cuộn để xem thêm chương
              </div>
            )}
          </aside>
        )}
      </main>

      {/* Mobile Chapter Navigation Footer */}
      {storyInfo && !generatedPrompt && (
        <div className="md:hidden border-t border-[#1a1a1a]/10 bg-white p-4 shrink-0 flex items-center justify-between">
           <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]/40">Truyện dang đọc</span>
              <span className="text-sm font-bold text-[#1a1a1a] line-clamp-1">{storyInfo.title}</span>
           </div>
           
           <div className="relative">
              <select 
                className="appearance-none bg-[#f5f2ed] border border-[#1a1a1a]/10 rounded-lg px-4 py-2 pr-8 text-xs font-medium outline-none"
                onChange={(e) => {
                  if(e.target.value) handleReadChapter(e.target.value);
                }}
                value={storyInfo.chapters.find(c => c.title === chapterData?.title)?.url || ""}
              >
                <option value="" disabled>Chọn chương...</option>
                {storyInfo.chapters.map((chapter, idx) => (
                  <option key={idx} value={chapter.url}>
                    Chương {idx + 1}: {chapter.title}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#1a1a1a]/60">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
