export interface RunnerInfoResponse {
  '0(runner)': _0runner;
  '1(event)': _1event;
  '2(category)': _2category;
}

interface _1event {
  name_en: string | null;
  name_gr: string | null;
}

interface _0runner {
  uuid: string;
  bib: string;
  birthdate: number | null;
  block: number | null;
  club: string | null;
  email: string;
  fathers_name: string | null;
  first_name: string | null;
  gender: string | null;
  nationality: string | null;
  last_name: string | null;
}

interface _2category {
  name_gr: string | null;
  name_en: string | null;
}
