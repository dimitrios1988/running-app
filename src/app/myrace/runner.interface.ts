export interface IRunner {
  runner: _0runner;
  event: _1event;
  place: _place;
  lp_runner: _3runner | null;
}

interface _1event {
  id: number;
  nameEn: string | null;
  nameGr: string | null;
}

interface _0runner {
  uuid: string;
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
  ageGroup: string | null;
}

interface _place {
  nameGr: string | null;
  nameEn: string | null;
}

interface _3runner {
  runnerQrData: string;
  isPrinted: boolean;
  isPrintable: boolean;
  receivesAsAGroup: boolean;
}
