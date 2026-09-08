// Typed Frontend Browser API Client for VYBZ // ARCADE SYSTEM
// Centralizes all communication with Next.js Route Handlers.

import {
  ChatIngestResponse,
  GenerateGameRequest,
  GenerateGameResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  CompleteGameRequest,
  CompleteGameResponse,
  GameMasterRequest,
  GameMasterResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  SubmitRoomAnswerRequest,
  SubmitRoomAnswerResponse,
  FinishRoomResponse,
  RoomPollState,
  PlayerBehavioralProfile,
  ArcadeOptionKey,
} from "@/types/api";

class ApiClient {
  private async postJson<TRequest, TResponse>(
    url: string,
    payload: TRequest
  ): Promise<TResponse> {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.error?.message || errorData.error || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(msg);
    }

    return res.json();
  }

  private async getJson<TResponse>(url: string): Promise<TResponse> {
    const res = await fetch(url);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.error?.message || errorData.error || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(msg);
    }
    return res.json();
  }

  // 1. Ingest Chat File (Multipart or JSON)
  public async ingestChat(fileOrRawText: File | string, fileName?: string): Promise<ChatIngestResponse> {
    if (typeof fileOrRawText === "string") {
      return this.postJson<{ rawText: string; fileName?: string }, ChatIngestResponse>(
        "/api/chat/ingest",
        { rawText: fileOrRawText, fileName }
      );
    }

    const formData = new FormData();
    formData.append("file", fileOrRawText);

    const res = await fetch("/api/chat/ingest", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Ingest error ${res.status}`);
    }

    return res.json();
  }

  // 2. Generate Game
  public async generateGame(params: GenerateGameRequest): Promise<GenerateGameResponse> {
    return this.postJson<GenerateGameRequest, GenerateGameResponse>(
      "/api/game/generate",
      params
    );
  }

  // 3. Submit Single Player Answer
  public async submitAnswer(params: SubmitAnswerRequest): Promise<SubmitAnswerResponse> {
    return this.postJson<SubmitAnswerRequest, SubmitAnswerResponse>(
      "/api/game/answer",
      params
    );
  }

  // 4. Complete Single Player Game
  public async completeGame(params: CompleteGameRequest): Promise<CompleteGameResponse> {
    return this.postJson<CompleteGameRequest, CompleteGameResponse>(
      "/api/game/complete",
      params
    );
  }

  // 5. Game Master Suggestions
  public async runGameMaster(params: GameMasterRequest): Promise<GameMasterResponse> {
    return this.postJson<GameMasterRequest, GameMasterResponse>(
      "/api/game/master",
      params
    );
  }

  // 6. Create Multiplayer Room
  public async createRoom(params: CreateRoomRequest): Promise<CreateRoomResponse> {
    return this.postJson<CreateRoomRequest, CreateRoomResponse>(
      "/api/rooms",
      params
    );
  }

  // 7. Join Multiplayer Room
  public async joinRoom(params: JoinRoomRequest): Promise<JoinRoomResponse> {
    return this.postJson<JoinRoomRequest, JoinRoomResponse>(
      "/api/rooms/join",
      params
    );
  }

  // 8. Poll Room State
  public async getRoom(roomId: string, userId?: string): Promise<RoomPollState> {
    const url = `/api/rooms/${encodeURIComponent(roomId)}${
      userId ? `?userId=${encodeURIComponent(userId)}` : ""
    }`;
    return this.getJson<RoomPollState>(url);
  }

  // 9. Set Player Ready
  public async setReady(roomId: string, userId: string, ready = true): Promise<{ success: boolean }> {
    return this.postJson<{ userId: string; ready: boolean }, { success: boolean }>(
      `/api/rooms/${encodeURIComponent(roomId)}/ready`,
      { userId, ready }
    );
  }

  // 10. Start Room (Host Only)
  public async startRoom(roomId: string, hostUserId: string): Promise<RoomPollState> {
    return this.postJson<{ hostUserId: string }, RoomPollState>(
      `/api/rooms/${encodeURIComponent(roomId)}/start`,
      { hostUserId }
    );
  }

  // 11. Submit Room Answer
  public async submitRoomAnswer(
    roomId: string,
    params: {
      userId: string;
      questionId: string;
      selectedAnswer: ArcadeOptionKey;
      responseTimeMs: number;
    }
  ): Promise<SubmitRoomAnswerResponse> {
    return this.postJson<SubmitRoomAnswerRequest, SubmitRoomAnswerResponse>(
      `/api/rooms/${encodeURIComponent(roomId)}/answer`,
      params
    );
  }

  // 12. Advance Room Question (Host or Next)
  public async advanceRoom(roomId: string, hostUserId?: string): Promise<RoomPollState> {
    return this.postJson<{ hostUserId?: string }, RoomPollState>(
      `/api/rooms/${encodeURIComponent(roomId)}/next`,
      { hostUserId }
    );
  }

  // 13. Finish Room
  public async finishRoom(roomId: string): Promise<FinishRoomResponse> {
    return this.postJson<{}, FinishRoomResponse>(
      `/api/rooms/${encodeURIComponent(roomId)}/finish`,
      {}
    );
  }

  // 14. Get Player Profile
  public async getProfile(userId: string): Promise<PlayerBehavioralProfile> {
    return this.getJson<PlayerBehavioralProfile>(
      `/api/profile?userId=${encodeURIComponent(userId)}`
    );
  }

  // 15. Frontend Compatibility Helpers
  public async getRoomStatus(roomCodeOrId: string, userId?: string): Promise<RoomPollState> {
    return this.getRoom(roomCodeOrId, userId);
  }

  public async startMatch(roomCodeOrId: string, hostUserId: string): Promise<RoomPollState> {
    return this.startRoom(roomCodeOrId, hostUserId);
  }

  public async advanceQuestion(roomCodeOrId: string, hostUserId?: string): Promise<RoomPollState> {
    return this.advanceRoom(roomCodeOrId, hostUserId);
  }

  public async resetMatch(roomCodeOrId: string, hostUserId: string): Promise<RoomPollState> {
    return this.startRoom(roomCodeOrId, hostUserId);
  }
}

export const apiClient = new ApiClient();
