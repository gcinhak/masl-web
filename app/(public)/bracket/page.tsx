// app/(public)/bracket/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
// 대진표 라이브러리 임포트
import { SingleEliminationBracket, Match, SVGViewer } from '@g-loot/react-tournament-brackets';

export default function PublicBracketPage() {
    const supabase = createClient();
    const [sports, setSports] = useState<any[]>([]);
    const [selectedSport, setSelectedSport] = useState('');
    const [bracketData, setBracketData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // 1. 진행 중인 종목 목록 불러오기
    useEffect(() => {
        const fetchSports = async () => {
            const { data } = await supabase.from('sports').select('id, name');
            if (data) setSports(data);
        };
        fetchSports();
    }, []);

    // 2. 선택한 종목의 대진표 데이터 불러오기 및 변환
    useEffect(() => {
        if (!selectedSport) return;

        const fetchBracket = async () => {
            setIsLoading(true);
            const { data: matchData } = await supabase
                .from('matches')
                .select(
                    `
          *,
          team1:team1_id(name),
          team2:team2_id(name)
        `
                )
                .eq('sport_id', selectedSport);

            if (matchData && matchData.length > 0) {
                // ★ 핵심: DB 데이터를 라이브러리 규격에 맞게 변환(Mapping)
                const formattedMatches = matchData.map((m) => {
                    const isFinished = m.status === '종료';
                    const team1Won = isFinished && m.team1_score > m.team2_score;
                    const team2Won = isFinished && m.team2_score > m.team1_score;

                    return {
                        id: m.id,
                        nextMatchId: m.next_match_id, // 이 키를 통해 트리 구조가 연결됩니다.
                        tournamentRoundText: m.round === 2 ? '결승' : `${m.round}강`,
                        state: isFinished ? 'DONE' : 'SCHEDULED',
                        participants: [
                            {
                                id: m.team1_id || `t1-dummy-${m.id}`,
                                isWinner: team1Won,
                                name: m.team1?.name || '미정',
                                resultText: isFinished ? m.team1_score?.toString() : null,
                            },
                            {
                                id: m.team2_id || `t2-dummy-${m.id}`,
                                isWinner: team2Won,
                                name: m.team2?.name || '미정',
                                resultText: isFinished ? m.team2_score?.toString() : null,
                            },
                        ],
                    };
                });
                setBracketData(formattedMatches);
            } else {
                setBracketData([]); // 데이터가 없을 때 초기화
            }
            setIsLoading(false);
        };

        fetchBracket();
    }, [selectedSport]);

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-12">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">대진표 및 결과 확인</h1>

            {/* 종목 선택 드롭다운 */}
            <div className="mb-8 max-w-sm">
                <select
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                    value={selectedSport}
                    onChange={(e) => setSelectedSport(e.target.value)}
                >
                    <option value="">종목을 선택해 주세요</option>
                    {sports.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* 대진표 렌더링 영역 */}
            <div className="bg-white rounded-xl shadow-sm border p-4 md:p-8 overflow-x-auto">
                {isLoading ? (
                    <div className="text-center py-20 text-gray-500">데이터를 불러오는 중입니다...</div>
                ) : bracketData.length > 0 ? (
                    // 모바일에서도 좌우로 스크롤해서 볼 수 있도록 충분한 최소 너비 부여
                    <div style={{ minWidth: '800px', minHeight: '500px' }}>
                        <SingleEliminationBracket
                            matches={bracketData}
                            matchComponent={Match}
                            svgWrapper={({ children, ...props }) => (
                                // 트리 그래픽(SVG)을 그려주는 래퍼
                                <SVGViewer width={800} height={500} {...props}>
                                    {children}
                                </SVGViewer>
                            )}
                        />
                    </div>
                ) : selectedSport ? (
                    <div className="text-center py-20 text-gray-500">
                        아직 대진표가 생성되지 않았습니다.
                        <br />
                        관리자가 대진표를 생성할 때까지 기다려 주세요.
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-400">위에서 종목을 선택하면 대진표가 표시됩니다.</div>
                )}
            </div>
        </div>
    );
}
