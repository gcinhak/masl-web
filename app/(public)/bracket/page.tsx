// app/(public)/bracket/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
// 대진표 라이브러리 임포트
import { SingleEliminationBracket } from '@g-loot/react-tournament-brackets';

// ==========================================
// 1. 손글씨 스타일 폰트 스타일 정의
// ==========================================
const handwritingStyle = {
    fontFamily: '"Caveat", "Indie Flower", cursive',
    fontWeight: 700,
    fontSize: '1.1rem',
    letterSpacing: '-0.5px',
};

// 손으로 그린 느낌의 박스 스타일
const roughBoxStyle = {
    border: '3px solid #000',
    borderRadius: '2px',
    boxShadow: '2px 2px 0px rgba(0,0,0,0.2), -1px -1px 0px rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
};

// ==========================================
// 2. 타입 정의 (TypeScript & ESLint 통과용)
// ==========================================
interface Participant {
    id: string | number;
    isWinner?: boolean;
    name?: string;
    resultText?: string | null;
    iconKey?: string;
}

interface BracketMatch {
    id: string | number;
    nextMatchId: string | number | null;
    tournamentRoundText: string;
    state: 'SCHEDULED' | 'DONE';
    participants: Participant[];
}

interface CustomMatchProps {
    match: BracketMatch;
    [key: string]: unknown; // 라이브러리 내부에서 넘겨주는 기타 props 허용
}

interface Sport {
    id: string;
    name: string;
}

// ==========================================
// 3. Custom Match Card 컴포넌트 (냥코 대전쟁 스타일 구현)
// ==========================================
const NyanMatchCard = ({ match }: CustomMatchProps) => {
    // ★ 런타임 에러 해결: participants 데이터가 match 객체 안에 들어있음을 명확히 하고 빈 배열로 방어합니다.
    const participants = match?.participants || [];
    const team1 = participants[0];
    const team2 = participants[1];

    return (
        <div
            className="bg-white p-2"
            style={{
                width: '280px',
                ...roughBoxStyle,
            }}
        >
            {/* 팀 1 영역 */}
            <div
                className={`flex items-center gap-2 p-2 mb-2 ${team1?.isWinner ? 'bg-gray-50' : ''}`}
                style={{ ...roughBoxStyle, borderWidth: '2px' }}
            >
                <div className="flex-1 flex items-center justify-between">
                    <span
                        className={`font-bold text-lg ${team1?.isWinner ? 'font-black' : 'text-gray-700'}`}
                        style={handwritingStyle}
                    >
                        {team1?.name || '(미정)'}
                    </span>
                    <span className="font-mono text-2xl font-black text-black ml-2">{team1?.resultText ?? '-'}</span>
                </div>
            </div>

            <div className="relative text-center my-1 h-2 flex items-center justify-center">
                <div className="absolute w-full h-px bg-gray-300"></div>
                <span className="relative bg-white px-2 text-xs font-bold text-gray-400">VS</span>
            </div>

            {/* 팀 2 영역 */}
            <div
                className={`flex items-center gap-2 p-2 ${team2?.isWinner ? 'bg-gray-50' : ''}`}
                style={{ ...roughBoxStyle, borderWidth: '2px' }}
            >
                <div className="flex-1 flex items-center justify-between">
                    <span
                        className={`font-bold text-lg ${team2?.isWinner ? 'font-black' : 'text-gray-700'}`}
                        style={handwritingStyle}
                    >
                        {team2?.name || '(미정)'}
                    </span>
                    <span className="font-mono text-2xl font-black text-black ml-2">{team2?.resultText ?? '-'}</span>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 4. 메인 Public 대진표 페이지
// ==========================================
export default function PublicBracketPage() {
    const supabase = createClient();
    const [sports, setSports] = useState<Sport[]>([]);
    const [selectedSport, setSelectedSport] = useState('');
    const [bracketData, setBracketData] = useState<BracketMatch[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [maxRound, setMaxRound] = useState(0);

    // 종목 목록 불러오기
    useEffect(() => {
        const fetchSports = async () => {
            const { data } = await supabase.from('sports').select('id, name');
            if (data) setSports(data as Sport[]);
        };
        fetchSports();
    }, [supabase]);

    // 대진표 데이터 불러오기 및 변환
    useEffect(() => {
        if (!selectedSport) return;

        const fetchBracket = async () => {
            setIsLoading(true);
            const { data: matchData } = await supabase
                .from('matches')
                .select(
                    `
                    *,
                    team1:team1_id(name, icon_key),
                    team2:team2_id(name, icon_key)
                `
                )
                .eq('sport_id', selectedSport);

            if (matchData && matchData.length > 0) {
                const max = Math.max(...matchData.map((m) => m.round));
                setMaxRound(max);

                const formattedMatches: BracketMatch[] = matchData.map((m) => {
                    const isFinished = m.status === '종료';
                    const team1Won = isFinished && m.team1_score > m.team2_score;
                    const team2Won = isFinished && m.team2_score > m.team1_score;

                    const resolveParticipant = (
                        team: { name?: string; icon_key?: string } | null,
                        teamId: string | number | null,
                        fallbackId: string | number,
                        isTeam1: boolean
                    ): Participant => ({
                        id: teamId || fallbackId,
                        isWinner: isTeam1 ? team1Won : team2Won,
                        name: team?.name || '미정',
                        resultText: isFinished
                            ? isTeam1
                                ? m.team1_score?.toString()
                                : m.team2_score?.toString()
                            : null,
                        iconKey: team?.icon_key,
                    });

                    const nextMatchId =
                        m.next_match_id === null || m.next_match_id === undefined ? null : m.next_match_id;

                    return {
                        id: m.id,
                        nextMatchId,
                        tournamentRoundText: m.round === 2 ? '결승전' : `${m.round}강전`,
                        state: isFinished ? 'DONE' : 'SCHEDULED',
                        participants: [
                            resolveParticipant(m.team1, m.team1_id, `t1-dummy-${m.id}`, true),
                            resolveParticipant(m.team2, m.team2_id, `t2-dummy-${m.id}`, false),
                        ],
                    };
                });
                setBracketData(formattedMatches);
            } else {
                setBracketData([]);
                setMaxRound(0);
            }
            setIsLoading(false);
        };

        fetchBracket();
    }, [selectedSport, supabase]);

    const hasFinalMatch = bracketData.some((m) => m.nextMatchId === null || m.nextMatchId === undefined);

    return (
        <div className="min-h-screen bg-gray-100 p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10 border-b-8 border-black pb-6">
                    <h1
                        className="text-6xl font-extrabold text-black tracking-tighter"
                        style={{ fontFamily: 'sans-serif' }}
                    >
                        {maxRound > 0 ? `${maxRound}강 대진표` : '대진표 확인'}
                    </h1>
                    <p className="text-xl text-gray-600 mt-3">MASL 스포츠 리그 실시간 상황</p>
                </div>

                <div className="mb-10 max-w-sm mx-auto">
                    <label className="block text-sm font-bold text-gray-700 mb-2 text-center">종목 선택</label>
                    <select
                        className="w-full p-4 border-4 border-black rounded-sm focus:ring-4 focus:ring-gray-300 font-bold text-lg bg-white"
                        value={selectedSport}
                        onChange={(e) => setSelectedSport(e.target.value)}
                    >
                        <option value="">대진표를 볼 종목을 선택하세요</option>
                        {sports.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="bg-white rounded-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black p-4 md:p-10 overflow-x-auto relative">
                    {isLoading ? (
                        <div className="text-center py-20 text-gray-500 text-lg font-bold">동물 선수들 입장 중...</div>
                    ) : bracketData.length > 0 && hasFinalMatch ? (
                        <div style={{ minWidth: '1000px', minHeight: '600px' }} className="relative">
                            <SingleEliminationBracket
                                matches={bracketData}
                                matchComponent={NyanMatchCard}
                                // 확대/축소(zoom) 및 panning을 제거하기 위해 SVGViewer 대신 기본 wrapper를 사용
                                svgWrapper={({ children }: { children: React.ReactNode }) => <>{children}</>}
                                // 라운드 헤더 비활성화
                                options={{
                                    style: {
                                        roundHeader: {
                                            isShown: false,
                                        },
                                    },
                                }}
                            />
                        </div>
                    ) : bracketData.length > 0 ? (
                        <div className="text-center py-20 text-red-500 text-lg font-bold">
                            대진표 데이터가 유효하지 않습니다. 최종 경기(nextMatchId가 null) 확인 후 다시 시도하세요.
                        </div>
                    ) : selectedSport ? (
                        <div className="text-center py-20 text-gray-500 text-lg font-bold">
                            아직 대진표가 생성되지 않았습니다.
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-400 text-lg font-bold">
                            위에서 종목을 선택하면 대진표가 표시됩니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
