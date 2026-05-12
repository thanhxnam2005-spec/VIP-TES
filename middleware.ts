import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Chỉ là một middleware pass-through để ép Next.js sử dụng Edge Runtime
  // thay vì tạo ra Node.js middleware mặc định.
  return NextResponse.next();
}

// Cấu hình matcher để middleware chạy trên tất cả các route ngoại trừ static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp4|webm|wav|mp3|ogg|pdf|txt)).*)',
  ],
};
