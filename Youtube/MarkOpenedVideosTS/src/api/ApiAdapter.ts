import ApiService from "./ApiService";
import type { VideoObject } from "./ApiService";
import type { IVideoStatsApi } from "../video-stats/VideoStatsManager";

export class ApiAdapter implements IVideoStatsApi {
    private apiService: ApiService;
    public setValue(key: string, value: string): void {
        // Placeholder for actual API call to set the value on the server
        console.log(`API Adapter: Setting ${key} to ${value}`);
        switch (key) {
            case "VideoObjectDictionary":
                this.apiService.createOrUpdateVideo(JSON.parse(value));
                break;

            default:
                break;
        }
    }

    public getService(): ApiService {
        return this.apiService;
    }

    public async getVideoStatus(id: string) {
        return this.apiService.getVideoStatus(id);
    }

    public async createOrUpdateVideo(item: VideoObject) {
        return this.apiService.createOrUpdateVideo(item);
    }

    constructor() {
        this.apiService = new ApiService();
    }
}

export default ApiAdapter;
