// next.config.ts (또는 .mjs)
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    /* 기존 설정이 있다면 유지하고 아래 내용을 추가하세요 */
    typescript: {
        // !! 주의: 빌드 시 타입 오류가 있어도 무시하고 배포를 진행합니다.
        ignoreBuildErrors: true,
    },
    eslint: {
        // 빌드 시 ESLint 오류도 무시하려면 추가 (선택사항)
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
