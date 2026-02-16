import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { Couple, User } from "../models";
import { generateInviteCode } from "../inviteCode";
import { EventEmitter } from "../event-emitter";

const COUPLE_KEY = "@rivalry_couple";

const coupleEmitter = new EventEmitter<Couple | null>();

async function loadCouple(): Promise<Couple | null> {
  try {
    const raw = await AsyncStorage.getItem(COUPLE_KEY);
    return raw ? (JSON.parse(raw) as Couple) : null;
  } catch {
    return null;
  }
}

async function persistCouple(couple: Couple | null): Promise<void> {
  try {
    if (couple) {
      await AsyncStorage.setItem(COUPLE_KEY, JSON.stringify(couple));
    } else {
      await AsyncStorage.removeItem(COUPLE_KEY);
    }
    coupleEmitter.emit(couple);
  } catch (e) {
    console.error("Failed to persist couple:", e);
  }
}

export async function createCouple(user: User): Promise<Couple> {
  const couple: Couple = {
    id: Crypto.randomUUID(),
    inviteCode: generateInviteCode(),
    status: "waiting",
    members: [user],
  };
  await persistCouple(couple);
  return couple;
}

export async function joinCouple(code: string, user: User): Promise<Couple> {
  const couple = await loadCouple();

  // Local-only: the couple must already exist and match the code
  if (!couple || couple.inviteCode !== code.toUpperCase()) {
    throw new Error("Invalid invite code");
  }

  if (couple.members.length >= 2) {
    throw new Error("Room is already full");
  }

  // Prevent joining your own room
  if (couple.members.some((m) => m.id === user.id)) {
    throw new Error("You are already in this room");
  }

  const updated: Couple = {
    ...couple,
    status: "ready",
    members: [...couple.members, user],
  };
  await persistCouple(updated);
  return updated;
}

export async function getCouple(): Promise<Couple | null> {
  return loadCouple();
}

export function subscribeToCouple(cb: (couple: Couple | null) => void): () => void {
  return coupleEmitter.subscribe(cb);
}
