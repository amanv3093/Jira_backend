"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = exports.sendResponse = void 0;
class ApiResponse {
    constructor(statusCode, data = null, message = "Success", errors = []) {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;
        this.errors = errors;
    }
}
exports.ApiResponse = ApiResponse;
const sendResponse = (res, status, data = null, message = "", errors = []) => {
    // logger.info(`Sending response ${status}, message: ${message}`);
    return res
        .status(status)
        .json(new ApiResponse(status, data, message, errors));
};
exports.sendResponse = sendResponse;
