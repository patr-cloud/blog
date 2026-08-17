export interface Author {
  name: string;
  profile: string;
  bio: string;
}

const authors: Record<string, Author> = {
  "rakshith-ravi": {
    name: "Rakshith Ravi",
    profile: "https://github.com/rakshith-ravi",
    bio: "Building Patr - simplifying cloud infrastructure for scale",
  },
};

export default authors;
