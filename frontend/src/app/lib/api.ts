const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type ApiOptions = RequestInit & {
  token?: string;
};

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { token, headers, ...requestOptions } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message || "Something went wrong"
    );
  }

  return data;
}