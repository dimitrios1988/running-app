export interface IRunner {
  runner: _0runner;
  event: _1event;
  place: _place;
}

interface _1event {
  nameEn: string | null;
  nameGr: string | null;
}

interface _0runner {
  bib: string;
  birthdate: Date | null;
  block: number | null;
  club: string | null;
  email: string;
  fathersName: string | null;
  firstName: string | null;
  gender: string | null;
  nationality: string | null;
  lastName: string | null;
}

interface _place {
  nameGr: string | null;
  nameEn: string | null;
}
