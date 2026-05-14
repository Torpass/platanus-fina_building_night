const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Failed to post ${path}`);
  return res.json();
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
  if (!res.ok) {
    let msg = `Failed to delete ${path}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchPost(id: string) {
  const res = await fetch(`${API_BASE}/posts/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("Post no encontrado");
    throw new Error("Failed to fetch post");
  }
  return res.json();
}

export async function deleteProfile(id: string) {
  return apiDelete(`/profiles/${id}`);
}

export async function fetchProfiles() {
  const res = await fetch(`${API_BASE}/profiles`);
  if (!res.ok) throw new Error("Failed to fetch profiles");
  return res.json();
}

export async function fetchPosts(filters?: {
  profile_id?: string;
  destination?: string;
  experience_type?: string;
  urgency_level?: string;
  trending?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters?.profile_id) params.append("profile_id", filters.profile_id);
  if (filters?.destination) params.append("destination", filters.destination);
  if (filters?.experience_type) params.append("experience_type", filters.experience_type);
  if (filters?.urgency_level) params.append("urgency_level", filters.urgency_level);
  if (filters?.trending) params.append("trending", "true");

  const res = await fetch(`${API_BASE}/posts?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
}

export async function fetchTrendingPosts() {
  const res = await fetch(`${API_BASE}/posts/trending`);
  if (!res.ok) throw new Error("Failed to fetch trending posts");
  return res.json();
}

export async function fetchUrgentPosts() {
  const res = await fetch(`${API_BASE}/posts/urgent`);
  if (!res.ok) throw new Error("Failed to fetch urgent posts");
  return res.json();
}

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE}/profiles/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}
