# Archiving v1.0.0 on Zenodo

Step-by-step instructions for the author to archive the release and obtain a citable DOI. This is a one-time action only the author can take (it requires the author's own GitHub and Zenodo accounts) — everything else (metadata files) is already prepared in this repository.

## Prerequisites already in place

- `CITATION.cff` — citation metadata for GitHub's own "Cite this repository" feature and for Zenodo.
- `.zenodo.json` — Zenodo-specific metadata (title, authors, license, keywords) that Zenodo reads automatically when archiving a GitHub release.

## Steps

1. Go to [zenodo.org](https://zenodo.org) and log in (GitHub login is supported and simplest).
2. Go to your Zenodo account's **GitHub** settings page ([zenodo.org/account/settings/github/](https://zenodo.org/account/settings/github/)).
3. Find `kaushalyaprabath27/traffic-survey-app` in the repository list and toggle it **on**. This does not archive anything by itself — it only tells Zenodo to watch this repository for new releases going forward.
4. Because `v1.0.0` was tagged and released *before* this toggle was switched on, Zenodo will not automatically archive it retroactively. Two options:
   - **Recommended:** cut a new release (e.g. `v1.0.1`, once the current pending changes are reviewed and merged — see `CHANGELOG.md`'s "Unreleased" section) *after* enabling the toggle. Zenodo will archive that release automatically and mint a DOI for it.
   - **Alternative:** use Zenodo's manual "New Upload" flow to archive the existing `v1.0.0` tarball directly (Zenodo's GitHub integration page has a link for this), pasting in the metadata from `.zenodo.json` by hand since manual uploads don't read that file automatically.
5. Once archived, Zenodo shows a DOI (e.g. `10.5281/zenodo.XXXXXXX`) and a "versioned DOI" that always points to the latest release.
6. Add that DOI to:
   - The manuscript's Resource availability field (currently `<<MEASURE: Zenodo DOI>>`).
   - `CITATION.cff`'s commented-out `doi:` line (uncomment and fill in).
   - The repository README, alongside the existing GitHub release link.

## Why this matters for the manuscript

MethodsX's Resource availability section currently lists only the GitHub repository URL. A GitHub repository can be renamed, deleted, or have its history rewritten by its owner at any time; a Zenodo DOI is a permanent, versioned archival copy that satisfies the "long-term availability" expectation reviewers and readers have for a methods article's companion software.
