// A branch of a repository, checked out or not.
export interface Branch {
  name: string
  path: string // file path to checkout
  checkedOut: boolean
  primary: boolean // repo itself, can't be removed
  remote?: boolean // a branch that lives only on a remote, i.e. `origin/feat`
}
