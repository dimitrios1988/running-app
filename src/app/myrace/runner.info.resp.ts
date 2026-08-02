export interface RunnerInfoResponse {
  '0(runner)': _0runner;
  '1(event)': _1event;
  '2(category)': _2category;
  '3(runner)': _3runner;
}

interface _1event {
  name_en: string | null;
  name_gr: string | null;
  id: number;
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
  age_group: string | null;
}

interface _2category {
  name_gr: string | null;
  name_en: string | null;
}

interface _3runner {
  runner_qr_data: string;
  is_printed: boolean;
  is_printable: boolean;
  receives_as_a_group: boolean;
}
