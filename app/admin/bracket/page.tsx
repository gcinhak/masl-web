// app/admin/bracket/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminBracketPage() {
    const supabase = createClient();
    const [sports, setSports] = useState<any[]>([]);
    const [selectedSport, setSelectedSport] = useState('');
    const [approvedTeams, setApprovedTeams] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // 1. 초기 데이터 불러오기 (종목 목록)
    useEffect(() => {
        const fetchSports = async () => {
            const { data } = await supabase.from('sports').select('id, name');
            if (data) setSports(data);
        };
        fetchSports();
    }, []);

    // 2. 특정 종목을 선택했을 때 '승인된 팀'과 '기존 생성된 경기' 불러오기
    useEffect(() => {
        if (!selectedSport) return;
        const fetchSportData = async () => {
            // 승인된 팀 8개 가져오기
            const { data: teams } = await supabase
                .from('teams')
                .select('*')
                .eq('sport_id', selectedSport)
                .eq('status', '승인됨');
            if (teams) setApprovedTeams(teams);

            // 생성된 매치 가져오기 (팀 이름 조인)
            const { data: matchData } = await supabase
                .from('matches')
                .select(
                    `
          *,
          team1:team1_id(name),
          team2:team2_id(name)
        `
                )
                .eq('sport_id', selectedSport)
                .order('round', { ascending: false }); // 8강 -> 4강 -> 결승 순서로 보기 위해
            if (matchData) setMatches(matchData);
        };
        fetchSportData();
    }, [selectedSport]);

    // 3. 8강 대진표 자동 생성 로직 (★핵심)
    const generateBracket = async () => {
        if (approvedTeams.length !== 8) {
            alert(`8강 대진표를 만들려면 정확히 8개의 팀이 승인되어야 합니다. (현재: ${approvedTeams.length}팀)`);
            return;
        }

        const isConfirmed = confirm('새로운 대진표를 생성하시겠습니까? (기존 대진표는 삭제됩니다)');
        if (!isConfirmed) return;

        setIsGenerating(true);

        // 기존 경기 삭제 (초기화)
        await supabase.from('matches').delete().eq('sport_id', selectedSport);

        // 팀 랜덤 섞기 (Shuffle)
        const shuffledTeams = [...approvedTeams].sort(() => Math.random() - 0.5);

        try {
            // [STEP 1] 결승전(Round 2) 먼저 생성해서 ID 확보
            const { data: final } = await supabase
                .from('matches')
                .insert({ sport_id: selectedSport, round: 2 })
                .select()
                .single();

            // [STEP 2] 4강전(Round 4) 2개 생성 (next_match_id를 결승전 ID로 연결)
            const { data: semi1 } = await supabase
                .from('matches')
                .insert({ sport_id: selectedSport, round: 4, next_match_id: final!.id })
                .select()
                .single();
            const { data: semi2 } = await supabase
                .from('matches')
                .insert({ sport_id: selectedSport, round: 4, next_match_id: final!.id })
                .select()
                .single();

            // [STEP 3] 8강전(Round 8) 4개 생성 및 팀 배정 (next_match_id를 4강전 ID로 연결)
            await supabase.from('matches').insert([
                {
                    sport_id: selectedSport,
                    round: 8,
                    team1_id: shuffledTeams[0].id,
                    team2_id: shuffledTeams[1].id,
                    next_match_id: semi1!.id,
                },
                {
                    sport_id: selectedSport,
                    round: 8,
                    team1_id: shuffledTeams[2].id,
                    team2_id: shuffledTeams[3].id,
                    next_match_id: semi1!.id,
                },
                {
                    sport_id: selectedSport,
                    round: 8,
                    team1_id: shuffledTeams[4].id,
                    team2_id: shuffledTeams[5].id,
                    next_match_id: semi2!.id,
                },
                {
                    sport_id: selectedSport,
                    round: 8,
                    team1_id: shuffledTeams[6].id,
                    team2_id: shuffledTeams[7].id,
                    next_match_id: semi2!.id,
                },
            ]);

            alert('대진표가 성공적으로 생성되었습니다!');
            window.location.reload(); // 데이터 새로고침
        } catch (error) {
            console.error(error);
            alert('대진표 생성 중 오류가 발생했습니다.');
        }
        setIsGenerating(false);
    };

    // 4. 점수 업데이트 및 승자 자동 진출 로직
    const finishMatch = async (
        matchId: string,
        team1Id: string,
        team2Id: string,
        team1Score: number,
        team2Score: number,
        nextMatchId: string | null
    ) => {
        if (team1Score === team2Score) {
            alert('무승부는 입력할 수 없습니다. 연장전/승부차기 최종 점수를 입력해 주세요.');
            return;
        }

        const winnerId = team1Score > team2Score ? team1Id : team2Id;

        // 1) 현재 경기 점수 및 상태 업데이트
        await supabase
            .from('matches')
            .update({ team1_score: team1Score, team2_score: team2Score, status: '종료' })
            .eq('id', matchId);

        // 2) 다음 경기가 있다면 승자 밀어넣기
        if (nextMatchId) {
            // 다음 경기의 정보를 가져와서 team1 자리가 비었는지 확인
            const { data: nextMatch } = await supabase.from('matches').select('*').eq('id', nextMatchId).single();

            if (nextMatch) {
                // team1 자리가 비어있으면 거기로, 아니면 team2 자리로 진출
                const updateField = nextMatch.team1_id === null ? { team1_id: winnerId } : { team2_id: winnerId };
                await supabase.from('matches').update(updateField).eq('id', nextMatchId);
            }
        }
        alert('경기 결과가 저장되고 승자가 다음 라운드로 진출했습니다.');
        window.location.reload();
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">대진표 생성 및 스코어 입력</h1>

            {/* 1. 종목 선택 영역 */}
            <div className="bg-white p-6 rounded-xl border shadow-sm mb-8 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">관리할 종목 선택</label>
                    <select
                        className="w-full p-3 border rounded-lg"
                        value={selectedSport}
                        onChange={(e) => setSelectedSport(e.target.value)}
                    >
                        <option value="">종목을 선택하세요</option>
                        {sports.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={generateBracket}
                    disabled={!selectedSport || isGenerating}
                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {isGenerating ? '생성 중...' : '8강 대진표 자동 생성'}
                </button>
            </div>

            {/* 2. 생성된 경기 목록 (스코어보드 형태) */}
            {matches.length > 0 && (
                <div className="grid gap-4">
                    <h2 className="text-xl font-bold mb-2">진행 중인 경기 스코어보드</h2>
                    {matches.map((match) => (
                        <MatchCard key={match.id} match={match} onFinish={finishMatch} />
                    ))}
                </div>
            )}
        </div>
    );
}

// 개별 경기를 표시하고 점수를 입력받는 컴포넌트
function MatchCard({ match, onFinish }: { match: any; onFinish: Function }) {
    const [t1Score, setT1Score] = useState(match.team1_score || 0);
    const [t2Score, setT2Score] = useState(match.team2_score || 0);

    return (
        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between">
            <div className="w-20 text-center font-bold text-gray-500 bg-gray-100 py-1 rounded">
                {match.round === 2 ? '결승' : `${match.round}강`}
            </div>

            <div className="flex-1 flex items-center justify-center gap-6">
                {/* 팀 1 */}
                <div className="text-right flex-1 font-bold text-lg">{match.team1?.name || '(미정)'}</div>
                <input
                    type="number"
                    value={t1Score}
                    onChange={(e) => setT1Score(Number(e.target.value))}
                    disabled={match.status === '종료' || !match.team1_id || !match.team2_id}
                    className="w-16 p-2 text-center border rounded-lg text-xl font-bold bg-gray-50"
                />
                <span className="font-bold text-gray-400">VS</span>
                {/* 팀 2 */}
                <input
                    type="number"
                    value={t2Score}
                    onChange={(e) => setT2Score(Number(e.target.value))}
                    disabled={match.status === '종료' || !match.team1_id || !match.team2_id}
                    className="w-16 p-2 text-center border rounded-lg text-xl font-bold bg-gray-50"
                />
                <div className="text-left flex-1 font-bold text-lg">{match.team2?.name || '(미정)'}</div>
            </div>

            <div className="w-24 text-right">
                {match.status === '종료' ? (
                    <span className="text-green-600 font-bold">경기 종료</span>
                ) : (
                    <button
                        onClick={() =>
                            onFinish(match.id, match.team1_id, match.team2_id, t1Score, t2Score, match.next_match_id)
                        }
                        disabled={!match.team1_id || !match.team2_id}
                        className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-black disabled:bg-gray-300"
                    >
                        결과 저장
                    </button>
                )}
            </div>
        </div>
    );
}
