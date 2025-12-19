export interface CarePlanItem {
  problem: string; // 看護問題
  goal: string;    // 目標
  intervention: string; // 介入・計画
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  address: string;
  condition: string;
}

export enum AppView {
  RECORDER = 'RECORDER',
  RESULT = 'RESULT',
  LIVE_DISCUSSION = 'LIVE_DISCUSSION'
}