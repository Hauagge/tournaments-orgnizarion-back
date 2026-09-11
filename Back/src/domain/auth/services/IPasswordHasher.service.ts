export abstract class IPasswordHasher {
  abstract hash(plainPassword: string): string;
  abstract compare(plainPassword: string, hashedPassword: string): boolean;
  abstract needsRehash(hashedPassword: string): boolean;
}

