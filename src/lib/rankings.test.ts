import { describe, it, expect } from 'vitest';
import { getTeamRank, type Rankings } from './rankings';

const data: Rankings = {
  updatedAt: '2026-10-21T15:00:00Z',
  polls: [
    {
      sport: 'volleyball', gender: 'womens', division: 'd1', poll: 'AVCA Coaches Poll',
      through: '2026-10-19', source: '', ranked: [{ teamId: 'usc-trojans', rank: 5 }],
    },
  ],
};

describe('getTeamRank', () => {
  it('finds a ranked team in its sport and gender', () => {
    expect(getTeamRank('usc-trojans', 'volleyball', 'womens', data)).toEqual({
      rank: 5, poll: 'AVCA Coaches Poll', through: '2026-10-19',
    });
  });
  it('is null for another gender, sport or team', () => {
    expect(getTeamRank('usc-trojans', 'volleyball', 'mens', data)).toBeNull();
    expect(getTeamRank('usc-trojans', 'soccer', 'womens', data)).toBeNull();
    expect(getTeamRank('ucla-bruins', 'volleyball', 'womens', data)).toBeNull();
  });
});
