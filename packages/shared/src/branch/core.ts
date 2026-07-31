/**
 * A branch of a repository, checked out or not. The branch is the identity: a checkout is
 * only where one happens to live, and every branch git knows about is offered whether or
 * not this machine has given it a folder yet.
 *
 * The same shape describes a vault's branches and a project's — the two differ in where
 * their checkouts go, not in what a branch is.
 */
export interface Branch {
  name: string
  /** Where its checkout is, or would go once it has one. */
  path: string
  checkedOut: boolean
  /** The repository itself, which cannot be removed. */
  primary: boolean
}
