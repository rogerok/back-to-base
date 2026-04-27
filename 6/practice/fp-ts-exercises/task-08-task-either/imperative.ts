// Task 8: TaskEither
// Rewrite using TaskEither from fp-ts/TaskEither
// Replace async/await + try/catch with TaskEither pipelines

interface Post {
  body: string;
  id: number;
  title: string;
  userId: number;
}

interface UserProfile {
  email: string;
  id: number;
  name: string;
}

interface EnrichedPost {
  author: UserProfile;
  post: Post;
}

// Simulated async API calls
async function fetchPost(id: number): Promise<Post> {
  const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  if (!res.ok) throw new Error(`Post ${id} not found`);
  return res.json();
}

async function fetchUser(id: number): Promise<UserProfile> {
  const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
  if (!res.ok) throw new Error(`User ${id} not found`);
  return res.json();
}

async function getEnrichedPost(postId: number): Promise<EnrichedPost | string> {
  try {
    const post = await fetchPost(postId);
    const author = await fetchUser(post.userId);
    return { author, post };
  } catch (e) {
    return `Failed: ${(e as Error).message}`;
  }
}

getEnrichedPost(1).then(console.log);
getEnrichedPost(9999).then(console.log);
