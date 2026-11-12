/** Body of POST assign_bib_template/v1. */
export interface AssignBibTemplateRequest {
  /** The registration record that holds the assignment (`3(runner)` in runner info). */
  '0(runner)': {
    id: number;
    assigned_bib_template: number;
  };
  /** The runner it must belong to. */
  '1(runner)': {
    uuid: string;
  };
}

/** The ids of the two records above; "0" echoes the registration record's id. */
export interface AssignBibTemplateResponse {
  '0': number | null;
  '1': number | null;
}
