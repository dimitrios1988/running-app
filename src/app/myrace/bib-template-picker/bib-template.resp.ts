export interface BibTemplateResponse {
  '0(available_bibs_events)': _0available_bibs_events | null;
  '1(bib_template)': _1bib_template | null;
}

interface _0available_bibs_events {
  /** The template's id - the value `assigned_bib_template` refers to. */
  bib_template: number | null;
}

interface _1bib_template {
  preview: Image[] | null;
}

interface Image {
  changed: number;
  hash: string;
  id: string;
  name: string;
  size: number;
  version: number;
}
