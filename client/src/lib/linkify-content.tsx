import { Link } from "wouter";

/**
 * Linkifies hashtags and mentions in post content
 * Converts #hashtag to clickable links to /hashtag/:tag
 * Converts @username to clickable links to /u/:username
 */
export function LinkifyContent({ content }: { content: string }) {
  const parts: (string | JSX.Element)[] = [];
  let currentIndex = 0;
  let key = 0;

  // Combined regex to find hashtags (#word) and mentions (@word)
  const regex = /(#\w+)|(@\w+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const matchedText = match[0];
    const matchIndex = match.index;

    // Add text before the match
    if (matchIndex > currentIndex) {
      parts.push(content.substring(currentIndex, matchIndex));
    }

    // Add the linkified hashtag or mention
    if (matchedText.startsWith('#')) {
      const hashtag = matchedText.substring(1).toLowerCase();
      parts.push(
        <Link 
          key={`link-${key++}`} 
          href={`/hashtag/${hashtag}`}
          className="text-primary hover:underline font-medium"
        >
          {matchedText}
        </Link>
      );
    } else if (matchedText.startsWith('@')) {
      const username = matchedText.substring(1);
      parts.push(
        <Link 
          key={`link-${key++}`} 
          href={`/u/${username}`}
          className="text-primary hover:underline font-medium"
        >
          {matchedText}
        </Link>
      );
    }

    currentIndex = matchIndex + matchedText.length;
  }

  // Add remaining text after the last match
  if (currentIndex < content.length) {
    parts.push(content.substring(currentIndex));
  }

  return <>{parts}</>;
}
