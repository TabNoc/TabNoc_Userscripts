import ApiService from "./ApiService";

export class ApiAdapter {
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

    constructor() {
        this.apiService = new ApiService();
    }
}

export default ApiAdapter;
