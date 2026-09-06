import { notFound } from "next/navigation";

/** Old /admin URL — return 404 so scanners learn nothing. */
export default function Gone() {
  notFound();
}
