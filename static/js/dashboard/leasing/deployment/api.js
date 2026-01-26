class DeploymentAPI extends BaseAPI {
    constructor() {
        super();
    }

    async create(formData) {
        return await this._sendRequest(window.AppConfig.urls.create, 'POST', formData);
    }

    async update(id, formData) {
        return await this._sendRequest(window.AppConfig.urls.update(id), 'POST', formData);
    }

    async delete(id) {
        return await this._sendRequest(window.AppConfig.urls.delete(id), 'POST');
    }

    async retrieve(id) {
        return await this._sendRequest(window.AppConfig.urls.retrieve(id), 'GET');
    }
}
