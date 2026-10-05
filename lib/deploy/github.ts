const GITHUB_API = "https://api.github.com";

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function fetchOrgs(token: string) {
  const res = await fetch(`${GITHUB_API}/user/orgs?per_page=100`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`GitHub orgs: ${res.status} ${await res.text()}`);
  const orgs = await res.json();
  return orgs.map((o: any) => ({
    login: o.login,
    avatar: o.avatar_url,
    id: o.id,
  }));
}

export async function fetchRepos(token: string, org?: string) {
  const url = org
    ? `${GITHUB_API}/orgs/${org}/repos?per_page=100&sort=updated&type=all`
    : `${GITHUB_API}/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) throw new Error(`GitHub repos: ${res.status} ${await res.text()}`);
  const repos = await res.json();
  return repos.map((r: any) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    defaultBranch: r.default_branch,
    updatedAt: r.updated_at,
    language: r.language,
    url: r.html_url,
  }));
}

export async function fetchBranches(token: string, owner: string, repo: string) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/branches?per_page=100`,
    { headers: headers(token) }
  );
  if (!res.ok) throw new Error(`GitHub branches: ${res.status} ${await res.text()}`);
  const branches = await res.json();
  return branches.map((b: any) => ({
    name: b.name,
    sha: b.commit?.sha?.slice(0, 7),
  }));
}

export async function fetchLatestCommit(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<{ sha: string; message: string; author: string; date: string } | null> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=1`,
      { headers: headers(token) }
    );
    if (!res.ok) return null;
    const commits = await res.json();
    if (!Array.isArray(commits) || commits.length === 0) return null;
    const c = commits[0];
    return {
      sha: c.sha?.slice(0, 7) || "",
      message: (c.commit?.message || "").split("\n")[0].slice(0, 100),
      author: c.commit?.author?.name || c.author?.login || "",
      date: c.commit?.author?.date || c.commit?.committer?.date || "",
    };
  } catch {
    return null;
  }
}

export async function verifyToken(token: string) {
  const res = await fetch(`${GITHUB_API}/user`, { headers: headers(token) });
  if (!res.ok) return null;
  const u = await res.json();
  return { login: u.login, name: u.name, avatar: u.avatar_url };
}
