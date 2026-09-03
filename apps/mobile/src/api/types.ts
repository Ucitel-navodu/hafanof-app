export type Role = "coordinator" | "foster" | "patron" | "adopter";

export interface User {
  id: string;
  name: string;
  initials: string;
  roles: Role[];
  activeRole: Role;
}

export interface Dog {
  id: string;
  name: string;
  sex: string;
  age_label: string;
  breed: string;
  weight_kg: number | null;
  status: string;
  foster_name: string | null;
  in_care_since: string;
  chip: string;
  neutered: string;
  vet: string;
  vaccination: string;
  deworming: string;
  last_checkup: string;
  looking_for_cs: string;
  looking_for_en: string;
  description_cs: string;
  description_en: string;
  tags: string;
  hero_photo: string | null;
  ready_to_adopt: number;
}

export interface Task {
  id: string;
  title: string;
  meta: string;
  time_label: string;
  done: number;
}

export interface Appointment {
  id: string;
  day: number;
  time_label: string;
  title: string;
  meta: string;
  who: string;
}

export interface Medication {
  id: string;
  dog_id: string;
  drug: string;
  days_left: number;
  pct: number;
  urgent: number;
  dog_name?: string;
}

export interface DiaryEntry {
  id: string;
  dog_id: string;
  author: string;
  date_label: string;
  mood: string;
  checks: Record<string, boolean>;
  note: string;
  created_at: string;
}

export interface ApprovalItem {
  id: string;
  dog_id: string;
  dog_name: string;
  author: string;
  story: string;
  photos: string[];
  tags: string[];
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface Wish {
  id: string;
  dog_id: string;
  dog_name: string;
  title: string;
  for_label: string;
  goal_amount: number;
  current_amount: number;
}

export interface Patronage {
  id: string;
  dog_id: string;
  dog_name: string;
  monthly_amount: number;
  given_total: number;
  since_label: string;
  status: string;
}

export interface PatronUpdate {
  id: string;
  dog_id: string;
  title: string;
  body: string;
  author: string;
  date_label: string;
  photo: string | null;
}

export interface Fact {
  k: string;
  v: string;
}

export interface AdoptionApplication {
  id: string;
  dog_id: string;
  applicant_name: string;
  housing: string | null;
  household: string | null;
  why: string | null;
  status: string;
  created_at: string;
}
