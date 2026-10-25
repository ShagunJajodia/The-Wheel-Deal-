import { ApiError } from "../api/client";

export interface MappedErrors {
  /** Messages keyed by the form field they belong to (the last segment of `loc`). */
  fields: Record<string, string>;
  /** Messages that did not match any known field. */
  other: string[];
}

/** Maps a FastAPI 422 detail array onto form fields using `loc[last]`. */
export function mapValidationErrors(error: unknown, knownFields: readonly string[]): MappedErrors {
  const mapped: MappedErrors = { fields: {}, other: [] };
  if (!(error instanceof ApiError)) return mapped;
  for (const issue of error.issues) {
    const field = issue.loc[issue.loc.length - 1];
    if (typeof field === "string" && knownFields.includes(field)) {
      mapped.fields[field] ??= issue.msg;
    } else {
      mapped.other.push(issue.msg);
    }
  }
  return mapped;
}
