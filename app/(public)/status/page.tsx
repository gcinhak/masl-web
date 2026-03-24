'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// 팀원 데이터 구조 정의
interface Member {
    grade: string;
    name: string;
    number: string;
}

// 스포츠 데이터 구조 정의
interface Sport {
    id: string;
    name: string;
}

// 팀 데이터 구조 정의
interface Team {
    id: string;
    sport_id: string;
    name: string;
    roster: Member[];
    status: string;
    applicant_email: string;
    representative_student: string;
    created_at: string;
    sports?: { name: string };
}

export default function StatusPage() {
    const supabase = createClient();
    const router = useRouter();

    // 상태 관리
    const [currentUserEmail, setCurrentUserEmail] = useState('');
    const [teams, setTeams] = useState<Team[]>([]);
    const [sports, setSports] = useState<Sport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

    // 수정 폼 상태
    const [editTeamName, setEditTeamName] = useState('');
    const [editSelectedSport, setEditSelectedSport] = useState('');
    const [editMembers, setEditMembers] = useState<Member[]>([]);

    // 1. 현재 로그인한 유저의 이메일 불러오기
    useEffect(() => {
        async function fetchCurrentUser() {
            const { data } = await supabase.auth.getUser();
            if (data.user?.email) {
                setCurrentUserEmail(data.user.email);
            } else {
                // 로그인하지 않은 경우 로그인 페이지로 이동
                router.push('/auth/signin');
            }
        }
        fetchCurrentUser();
    }, [supabase, router]);

    // 2. 모집중인 종목 불러오기
    useEffect(() => {
        async function fetchSports() {
            const { data } = await supabase.from('sports').select('id, name').eq('status', '모집중');
            if (data) {
                setSports(data);
            }
        }
        fetchSports();
    }, [supabase]);

    // 3. 현재 사용자가 신청한 팀들 불러오기
    useEffect(() => {
        async function fetchUserTeams() {
            if (!currentUserEmail) return;

            setIsLoading(true);
            const { data, error } = await supabase
                .from('teams')
                .select('*, sports(name)')
                .eq('applicant_email', currentUserEmail)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('팀 목록 불러오기 에러:', error);
            } else if (data) {
                setTeams(data as Team[]);
            }
            setIsLoading(false);
        }
        fetchUserTeams();
    }, [supabase, currentUserEmail]);

    // 4. 팀원 추가 함수
    const addMember = (isEditing: boolean) => {
        if (isEditing) {
            setEditMembers([...editMembers, { grade: '', name: '', number: '' }]);
        }
    };

    // 5. 팀원 삭제 함수
    const removeMember = (index: number, isEditing: boolean) => {
        if (isEditing) {
            if (editMembers.length <= 1) return;
            const newMembers = editMembers.filter((_, i) => i !== index);
            setEditMembers(newMembers);
        }
    };

    // 6. 입력값 변경 함수
    const handleMemberChange = (index: number, field: keyof Member, value: string, isEditing: boolean) => {
        if (isEditing) {
            const newMembers = [...editMembers];
            newMembers[index][field] = value;
            setEditMembers(newMembers);
        }
    };

    // 7. 수정 모드 시작
    const startEditing = (team: Team) => {
        setEditingTeamId(team.id);
        setEditTeamName(team.name);
        setEditSelectedSport(team.sport_id);
        setEditMembers(team.roster || []);
    };

    // 8. 수정 취소
    const cancelEditing = () => {
        setEditingTeamId(null);
        setEditTeamName('');
        setEditSelectedSport('');
        setEditMembers([]);
    };

    // 9. 수정 저장
    const saveEdit = async (teamId: string) => {
        // 유효성 검사
        const validMembers = editMembers.filter((m) => m.name.trim() !== '');
        if (validMembers.length === 0) {
            alert('최소 한 명 이상의 팀원 이름을 입력해 주세요.');
            return;
        }

        if (!editTeamName.trim()) {
            alert('팀 이름을 입력해 주세요.');
            return;
        }

        if (!editSelectedSport) {
            alert('종목을 선택해 주세요.');
            return;
        }

        // 중복 검사: 같은 이름이 있는지 확인
        const names = validMembers.map((m) => m.name.trim());
        const uniqueNames = new Set(names);

        if (uniqueNames.size !== names.length) {
            alert('같은 이름의 팀원이 있습니다. 중복된 이름을 확인해 주세요.');
            return;
        }

        // 중복 검사: 같은 번호가 있는지 확인
        const numbers = validMembers.map((m) => m.number.trim()).filter((num) => num !== '');
        const uniqueNumbers = new Set(numbers);

        if (uniqueNumbers.size !== numbers.length) {
            alert('같은 번호의 팀원이 있습니다. 중복된 번호를 확인해 주세요.');
            return;
        }

        // 대표 학생은 첫 번째 팀원
        const representativeStudent = validMembers[0].name;

        const { error } = await supabase
            .from('teams')
            .update({
                sport_id: editSelectedSport,
                name: editTeamName,
                roster: validMembers,
                representative_student: representativeStudent,
            })
            .eq('id', teamId);

        if (error) {
            console.error('수정 에러:', error);
            alert('수정 중 오류가 발생했습니다.');
        } else {
            alert('팀 정보가 수정되었습니다.');
            setEditingTeamId(null);
            // 팀 목록 다시 불러오기
            const { data } = await supabase
                .from('teams')
                .select('*, sports(name)')
                .eq('applicant_email', currentUserEmail)
                .order('created_at', { ascending: false });
            if (data) {
                setTeams(data as Team[]);
            }
        }
    };

    // 10. 팀 삭제
    const deleteTeam = async (teamId: string, teamName: string) => {
        const isConfirmed = confirm(`정말 '${teamName}' 팀을 삭제하시겠습니까?`);
        if (!isConfirmed) return;

        const { error } = await supabase.from('teams').delete().eq('id', teamId);

        if (error) {
            console.error('삭제 에러:', error);
            alert('삭제 중 오류가 발생했습니다.');
        } else {
            alert('팀이 삭제되었습니다.');
            // 팀 목록 다시 불러오기
            const { data } = await supabase
                .from('teams')
                .select('*, sports(name)')
                .eq('applicant_email', currentUserEmail)
                .order('created_at', { ascending: false });
            if (data) {
                setTeams(data as Team[]);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                {/* 타이틀 영역 */}
                <div className="w-full border-b-8 border-black pb-6 mb-10 text-center md:text-left">
                    <h1
                        className="text-5xl md:text-6xl font-extrabold text-black tracking-tighter"
                        style={{ fontFamily: 'sans-serif' }}
                    >
                        참가 신청 현황
                    </h1>
                </div>

                {/* 신청자 이메일 정보 */}
                {currentUserEmail && (
                    <div className="bg-blue-50 border-4 border-blue-400 p-4 rounded-sm mb-8">
                        <p className="text-lg font-bold text-blue-900">
                            신청자 이메일: <span className="text-blue-600">{currentUserEmail}</span>
                        </p>
                    </div>
                )}

                {isLoading ? (
                    <p className="text-gray-500 text-lg font-semibold">데이터를 불러오는 중입니다...</p>
                ) : teams.length === 0 ? (
                    <div className="bg-white border-4 border-black p-8 rounded-sm text-center">
                        <p className="text-lg text-gray-600 mb-6">아직 신청한 팀이 없습니다.</p>
                        <button
                            onClick={() => router.push('/apply')}
                            className="px-6 py-3 bg-black text-white font-bold text-lg rounded-sm hover:bg-gray-800 transition"
                        >
                            신청하기
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {teams.map((team) => (
                            <div
                                key={team.id}
                                className="bg-white border-4 border-black p-6 md:p-8 rounded-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                            >
                                {editingTeamId === team.id ? (
                                    // 수정 모드
                                    <div className="flex flex-col gap-6">
                                        <h2 className="text-2xl font-bold text-black">팀 정보 수정</h2>

                                        {/* 종목 선택 */}
                                        <div>
                                            <label className="block text-lg font-bold text-black mb-2">종목</label>
                                            <select
                                                value={editSelectedSport}
                                                onChange={(e) => setEditSelectedSport(e.target.value)}
                                                className="w-full p-3 border-4 border-black rounded-sm font-bold text-lg bg-white"
                                            >
                                                <option value="">종목을 선택해 주세요</option>
                                                {sports.map((sport) => (
                                                    <option key={sport.id} value={sport.id}>
                                                        {sport.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 팀 이름 */}
                                        <div>
                                            <label className="block text-lg font-bold text-black mb-2">팀 이름</label>
                                            <input
                                                type="text"
                                                value={editTeamName}
                                                onChange={(e) => setEditTeamName(e.target.value)}
                                                className="w-full p-3 border-4 border-black rounded-sm font-bold text-lg"
                                            />
                                        </div>

                                        {/* 팀원 명단 */}
                                        <div>
                                            <label className="block text-lg font-bold text-black mb-3">
                                                팀원 명단 (학년 / 이름 / 번호)
                                            </label>
                                            <div className="flex flex-col gap-2">
                                                {editMembers.map((member, index) => (
                                                    <div
                                                        key={index}
                                                        className={`flex flex-wrap md:flex-nowrap gap-2 items-center pb-2 ${
                                                            index === 0
                                                                ? 'bg-yellow-50 p-2 rounded border-2 border-yellow-200'
                                                                : ''
                                                        }`}
                                                    >
                                                        <span className="font-bold text-black min-w-7.5">
                                                            {index + 1}.{index === 0 && ' 대표'}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            placeholder="학년"
                                                            value={member.grade}
                                                            onChange={(e) =>
                                                                handleMemberChange(index, 'grade', e.target.value, true)
                                                            }
                                                            className="w-20 p-2 border-2 border-black rounded-sm font-bold text-center"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="이름"
                                                            value={member.name}
                                                            onChange={(e) =>
                                                                handleMemberChange(index, 'name', e.target.value, true)
                                                            }
                                                            className="flex-1 p-2 border-2 border-black rounded-sm font-bold"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="번호"
                                                            value={member.number}
                                                            onChange={(e) =>
                                                                handleMemberChange(
                                                                    index,
                                                                    'number',
                                                                    e.target.value,
                                                                    true
                                                                )
                                                            }
                                                            className="w-20 p-2 border-2 border-black rounded-sm font-bold text-center"
                                                        />
                                                        {editMembers.length > 1 && (
                                                            <button
                                                                onClick={() => removeMember(index, true)}
                                                                type="button"
                                                                className="px-3 py-1 bg-red-500 text-white font-bold rounded-sm hover:bg-red-600 transition"
                                                            >
                                                                삭제
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => addMember(true)}
                                                type="button"
                                                className="mt-3 px-4 py-2 bg-gray-300 text-black font-bold rounded-sm hover:bg-gray-400 transition"
                                            >
                                                + 팀원 추가
                                            </button>
                                        </div>

                                        {/* 버튼 영역 */}
                                        <div className="flex gap-3 justify-end">
                                            <button
                                                onClick={cancelEditing}
                                                type="button"
                                                className="px-6 py-3 bg-gray-400 text-white font-bold text-lg rounded-sm hover:bg-gray-500 transition"
                                            >
                                                취소
                                            </button>
                                            <button
                                                onClick={() => saveEdit(team.id)}
                                                type="button"
                                                className="px-6 py-3 bg-green-600 text-white font-bold text-lg rounded-sm hover:bg-green-700 transition"
                                            >
                                                저장
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // 조회 모드
                                    <div className="flex flex-col gap-4">
                                        {/* 상태 및 기본 정보 */}
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b-2 border-gray-200">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h2 className="text-2xl md:text-3xl font-bold text-black">
                                                        {team.name}
                                                    </h2>
                                                    <span
                                                        className={`px-3 py-1 text-sm font-bold rounded-full ${
                                                            team.status === '승인됨'
                                                                ? 'bg-green-100 text-green-700'
                                                                : team.status === '거절됨'
                                                                  ? 'bg-red-100 text-red-700'
                                                                  : 'bg-yellow-100 text-yellow-700'
                                                        }`}
                                                    >
                                                        {team.status}
                                                    </span>
                                                </div>
                                                <p className="text-lg text-gray-600 font-semibold">
                                                    종목: {team.sports?.name}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    신청일: {new Date(team.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* 팀 정보 */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-500 font-semibold mb-1">대표 학생</p>
                                                <p className="text-lg font-bold text-black">
                                                    {team.representative_student || '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 font-semibold mb-1">
                                                    신청자 이메일
                                                </p>
                                                <p className="text-lg font-bold text-black">{team.applicant_email}</p>
                                            </div>
                                        </div>

                                        {/* 팀원 명단 */}
                                        <div className="bg-gray-50 p-4 rounded-sm border-2 border-gray-200">
                                            <p className="text-lg font-bold text-black mb-3">팀원 명단</p>
                                            <div className="space-y-2">
                                                {team.roster && team.roster.length > 0 ? (
                                                    team.roster.map((member, index) => (
                                                        <div
                                                            key={index}
                                                            className={`p-2 rounded text-sm font-semibold ${
                                                                index === 0
                                                                    ? 'bg-yellow-100 text-yellow-900'
                                                                    : 'bg-white text-gray-800'
                                                            }`}
                                                        >
                                                            {index + 1}. {member.grade}학년 {member.name}
                                                            {member.number && ` (${member.number}번)`}{' '}
                                                            {index === 0 && '👑 대표'}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-gray-500">팀원 정보가 없습니다.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* 버튼 영역 */}
                                        {team.status === '승인대기' && (
                                            <div className="flex gap-3 justify-end pt-4 border-t-2 border-gray-200">
                                                <button
                                                    onClick={() => deleteTeam(team.id, team.name)}
                                                    className="px-6 py-3 bg-red-500 text-white font-bold text-lg rounded-sm hover:bg-red-600 transition"
                                                >
                                                    삭제
                                                </button>
                                                <button
                                                    onClick={() => startEditing(team)}
                                                    className="px-6 py-3 bg-blue-600 text-white font-bold text-lg rounded-sm hover:bg-blue-700 transition"
                                                >
                                                    수정
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* 새 신청 버튼 */}
                        <button
                            onClick={() => router.push('/apply')}
                            className="w-full px-6 py-4 bg-black text-white font-bold text-lg rounded-sm hover:bg-gray-800 transition"
                        >
                            새 팀 신청하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
