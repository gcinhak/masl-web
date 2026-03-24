// app/(public)/bracket/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
// 대진표 라이브러리 및 custom 컴포넌트 임포트
import { SingleEliminationBracket, SVGViewer } from '@g-loot/react-tournament-brackets';
// 동물 아이콘 임포트 (Game Icons 세트 사용)
import {
    GiCat,
    GiDogHouse,
    GiBearHead,
    GiDinosaurBones,
    GiWolfHead,
    GiFrog,
    GiCrowNest,
    GiDragonHead,
    GiCrownedSkull,
} from 'react-icons/gi';

// ==========================================
// 1. 동물 아이콘 매핑 테이블 (DB의 icon_key와 매핑)
// ==========================================
const iconMap: { [key: string]: React.ReactNode } = {
    cat: <GiCat className="w-10 h-10 text-black" />,
    dog: <GiDogHouse className="w-10 h-10 text-black" />,
    bear: <GiBearHead className="w-10 h-10 text-black" />,
    dino: <GiDinosaurBones className="w-10 h-10 text-black" />,
    wolf: <GiWolfHead className="w-10 h-10 text-black" />,
    frog: <GiFrog className="w-10 h-10 text-black" />,
    crow: <GiCrowNest className="w-10 h-10 text-black" />,
    dragon: <GiDragonHead className="w-10 h-10 text-black" />,
};
// 동물이 지정되지 않았거나 없을 때 보여줄 기본 아이콘 (해골)
const DefaultIcon = <GiCrownedSkull className="w-10 h-10 text-gray-300" />;

// ==========================================
// 2. Custom Match Card 컴포넌트 (냥코 대전쟁 스타일 구현)
// ==========================================

// ✅ 타입스크립트와 ESLint를 만족시키기 위한 데이터 생김새 정의
interface Participant {
    id: string | number;
    isWinner?: boolean;
    name?: string;
    resultText?: string | null;
    iconKey?: string;
}

interface CustomMatchProps {
    match: {
        tournamentRoundText?: string;
        [key: string]: unknown;
    };
    participants: Participant[];
}

// 라이브러리의 기본 카드 디자인을 버리고, 흑백 선과 동물이 올라간 디자인을 직접 그립니다.
const NyanMatchCard = ({ match, participants }: CustomMatchProps) => {
    // 팀 1, 2 정보 가져오기
    const team1 = participants[0];
    const team2 = participants[1];

    // DB에서 가져온 icon_key를 이용해 동물 아이콘 가져오기
    const getIcon = (party?: Participant) => {
        if (!party || !party.id) return null; // 팀이 미정일 때
        // dummy ID일 경우 (미정)
        if (typeof party.id === 'string' && party.id.startsWith('t1-dummy')) return null;

        // DB의 icon_key 값 사용
        const key = party.iconKey;
        if (!key) return DefaultIcon;
        return iconMap[key] || DefaultIcon;
    };

    return (
        // 흑백 테마 외곽선
        <div
            className="border-4 border-black bg-white p-2 rounded-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            style={{ width: '280px' }}
        >
            {/* 라운드 정보 (8강, 4강 등) */}
            <div className="text-center font-extrabold text-xl mb-3 border-b-2 border-dashed border-gray-400 pb-1">
                {match.tournamentRoundText}
            </div>

            {/* 팀 1 영역 */}
            <div className={`flex items-center gap-3 p-2 mb-2 ${team1?.isWinner ? 'bg-gray-100' : ''}`}>
                <div className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-lg p-1 bg-white">
                    {getIcon(team1)}
                </div>
                <div className="flex-1 flex items-center justify-between">
                    <span className={`font-bold text-lg ${team1?.isWinner ? 'font-black' : 'text-gray-700'}`}>
                        {team1?.name || '(미정)'}
                    </span>
                    <span className="font-mono text-3xl font-black text-black ml-2">{team1?.resultText ?? '-'}</span>
                </div>
            </div>

            {/* VS 구분선 */}
            <div className="relative text-center my-1 h-2 flex items-center justify-center">
                <div className="absolute w-full h-px bg-gray-300"></div>
                <span className="relative bg-white px-2 text-xs font-bold text-gray-400">VS</span>
            </div>

            {/* 팀 2 영역 */}
            <div className={`flex items-center gap-3 p-2 ${team2?.isWinner ? 'bg-gray-100' : ''}`}>
                <div className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-lg p-1 bg-white">
                    {getIcon(team2)}
                </div>
                <div className="flex-1 flex items-center justify-between">
                    <span className={`font-bold text-lg ${team2?.isWinner ? 'font-black' : 'text-gray-700'}`}>
                        {team2?.name || '(미정)'}
                    </span>
                    <span className="font-mono text-3xl font-black text-black ml-2">{team2?.resultText ?? '-'}</span>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 3. 메인 Public 대진표 페이지
// ==========================================

// ✅ ESLint 에러 해결을 위한 타입 정의
interface Sport {
    id: string;
    name: string;
}

interface BracketMatch {
    id: string | number;
    nextMatchId: string | number | null;
    tournamentRoundText: string;
    state: 'SCHEDULED' | 'DONE';
    participants: Participant[];
}

export default function PublicBracketPage() {
    const supabase = createClient();

    // ✅ any[] 대신 명확한 타입 사용
    const [sports, setSports] = useState<Sport[]>([]);
    const [selectedSport, setSelectedSport] = useState('');
    const [bracketData, setBracketData] = useState<BracketMatch[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [maxRound, setMaxRound] = useState(0);

    // 1. 진행 중인 종목 목록 불러오기
    useEffect(() => {
        const fetchSports = async () => {
            const { data } = await supabase.from('sports').select('id, name');
            if (data) setSports(data as Sport[]);
        };
        fetchSports();
    }, [supabase]);

    // 2. 선택한 종목의 대진표 데이터 불러오기 및 변환
    useEffect(() => {
        if (!selectedSport) return;

        const fetchBracket = async () => {
            setIsLoading(true);

            // ✅ Parser Error 방지를 위해 select 쿼리 내의 주석 제거
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
                // 최대 라운드 계산
                const max = Math.max(...matchData.map((m) => m.round));
                setMaxRound(max);

                const formattedMatches: BracketMatch[] = matchData.map((m) => {
                    const isFinished = m.status === '종료';
                    const team1Won = isFinished && m.team1_score > m.team2_score;
                    const team2Won = isFinished && m.team2_score > m.team1_score;

                    return {
                        id: m.id,
                        nextMatchId: m.next_match_id,
                        tournamentRoundText: m.round === 2 ? '결승전' : `${m.round}강전`,
                        state: isFinished ? 'DONE' : 'SCHEDULED',
                        participants: [
                            {
                                id: m.team1_id || `t1-dummy-${m.id}`,
                                isWinner: team1Won,
                                name: m.team1?.name || '미정',
                                resultText: isFinished ? m.team1_score?.toString() : null,
                                iconKey: m.team1?.icon_key,
                            },
                            {
                                id: m.team2_id || `t2-dummy-${m.id}`,
                                isWinner: team2Won,
                                name: m.team2?.name || '미정',
                                resultText: isFinished ? m.team2_score?.toString() : null,
                                iconKey: m.team2?.icon_key,
                            },
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

    return (
        <div className="min-h-screen bg-gray-100 p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                {/* 첨부 이미지와 비슷한 느낌의 큼직한 흑백 한글 타이틀 */}
                <div className="text-center mb-10 border-b-8 border-black pb-6">
                    <h1
                        className="text-6xl font-extrabold text-black tracking-tighter"
                        style={{ fontFamily: 'sans-serif' }}
                    >
                        {maxRound > 0 ? `${maxRound}강 대진표` : '대진표 확인'}
                    </h1>
                    <p className="text-xl text-gray-600 mt-3">MASL 스포츠 리그 실시간 상황</p>
                </div>

                {/* 종목 선택 드롭다운 */}
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

                {/* 대진표 렌더링 영역 */}
                <div className="bg-white rounded-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black p-4 md:p-10 overflow-x-auto relative">
                    {isLoading ? (
                        <div className="text-center py-20 text-gray-500 text-lg">동물 선수들 입장 중...</div>
                    ) : bracketData.length > 0 ? (
                        // 모바일 지원을 위한 최소 너비 및 높이 세팅
                        <div style={{ minWidth: '1000px', minHeight: '600px' }} className="relative">
                            {/* 중앙 "우승" 글자 overlay (라이브러리 위에 HTML로 강제 고정) */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white px-6 py-2 border-4 border-black">
                                <span className="text-4xl font-extrabold text-black">우 승</span>
                            </div>

                            <SingleEliminationBracket
                                matches={bracketData}
                                // ★ 핵심: 우리가 만든 NyanMatchCard 컴포넌트를 사용하도록 지정
                                matchComponent={NyanMatchCard}
                                svgWrapper={({
                                    children,
                                    ...props
                                }: {
                                    children: React.ReactNode;
                                    [key: string]: unknown;
                                }) => (
                                    // 트리 그래픽(SVG)의 크기와 위치 조정
                                    <SVGViewer
                                        width={1000}
                                        height={600}
                                        {...props}
                                        // 선 색상을 흑백 테마에 맞게 굵고 투박한 검은색으로 변경
                                        baseColor="#000000"
                                        highlightColor="#000000"
                                    >
                                        {children}
                                    </SVGViewer>
                                )}
                            />
                        </div>
                    ) : selectedSport ? (
                        <div className="text-center py-20 text-gray-500 text-lg">
                            아직 관리자가 대진표를 생성하지 않았습니다.
                            <br />
                            잠시만 기다려 주세요!
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-400 text-lg">
                            위에서 종목을 선택하면 귀여운 동물 대진표가 표시됩니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
