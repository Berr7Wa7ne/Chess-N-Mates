import type { Competition } from '@/src/types/competition';

export interface FixtureDateRange {
  start: string;
  end: string;
}

const STAGES=['Final','Semifinal','Quarterfinal','Round of 16','Round of 32','Round of 64','Round of 128'];

export function knockoutStageLabel(totalRounds:number,round:number):string{
  const diff=totalRounds-round;
  if(diff<0){
    return `ROUND ${round}`;
  }
  return STAGES[Math.min(diff,STAGES.length-1)]??`ROUND ${round}`;
}

export function getRoundLabel(competition:Competition,round:number):string{
  if(competition.tournament_type==='knockout'){
    return knockoutStageLabel(competition.rounds,round);
  }
  return `ROUND ${round}`;
}

export function formatFixtureDate(d?:string|null):string{
  if(!d){
    return '';
  }
  const dt=new Date(d);
  if(isNaN(dt.getTime())){
    return '';
  }
  return dt.toLocaleString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
}

export function getFixtureDateRange(competition:Competition):FixtureDateRange{
  return {
    start: formatFixtureDate(competition.start_date)||formatFixtureDate(competition.registration_open_at),
    end: formatFixtureDate(competition.end_date)||formatFixtureDate(competition.registration_close_at),
  };
}

export function fixtureDownloadSlug(name:string):string{
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'fixtures';
}