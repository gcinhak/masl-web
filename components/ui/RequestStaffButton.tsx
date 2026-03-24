// components/ui/RequestStaffButton.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function RequestStaffButton({ initialStatus }: { initialStatus: string }) {
    const [status, setStatus] = useState(initialStatus);
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

    const handleRequest = async () => {
        if (!confirm('운영진 권한을 요청하시겠습니까? 관리자 승인 후 메뉴가 활성화됩니다.')) return;

        setIsLoading(true);
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (user) {
            const { error } = await supabase.from('user_roles').update({ status: 'pending_staff' }).eq('id', user.id);

            if (!error) {
                alert('권한 요청이 접수되었습니다!');
                setStatus('pending_staff');
            } else {
                alert('요청 중 오류가 발생했습니다.');
            }
        }
        setIsLoading(false);
    };

    if (status === 'pending_staff') {
        return (
            <button
                disabled
                className="mt-4 md:mt-0 px-6 py-2 bg-gray-400 text-white font-semibold rounded-lg cursor-not-allowed"
            >
                승인 대기 중
            </button>
        );
    }

    return (
        <button
            onClick={handleRequest}
            disabled={isLoading}
            className="mt-4 md:mt-0 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400"
        >
            {isLoading ? '요청 중...' : '권한 요청하기'}
        </button>
    );
}
