// app/page.tsx (기존 코드를 다 지우고 아래 코드로 덮어써보세요)
import LoginButton from '@/components/ui/LoginButton';

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">MASL 웹 매니저</h1>
            <p className="mb-6 text-gray-600">관리자 로그인이 필요합니다.</p>
            <LoginButton />
        </main>
    );
}
