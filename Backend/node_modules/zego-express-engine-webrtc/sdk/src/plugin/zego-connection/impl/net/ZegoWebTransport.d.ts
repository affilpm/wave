import { AccessHubMessageType, SocketState, StreamType } from '../../entity/AccessHubDefine';
import { WebTransportError } from '../../entity/http3';
import { ZegoLogger } from '../../util/logger';
interface WebTransportBidirectionalStream {
    readable: ReadableStream;
    writable: WritableStream;
}
interface IZegoWebTransportStream {
    stream: WebTransportBidirectionalStream | null;
    writer: WritableStreamDefaultWriter | null;
    reader: ReadableStreamDefaultReader | null;
    streamType: StreamType;
    streamID: number;
    isCreating: boolean;
}
export default class ZegoWebTransport {
    private _zgp_logger;
    readyState: SocketState;
    private _transport;
    private _webTransportStreams;
    private _unSendMsgs;
    private _streamCloseTasks;
    constructor(_zgp_logger: ZegoLogger);
    static isSupport(): boolean;
    getStreamByID(streamID: number): IZegoWebTransportStream | null;
    startConnect(url: string): void;
    onTransportClosed(): Promise<void>;
    onopen(e: any): void;
    onerror(e: any): void;
    onclose(e: any): void;
    onmessage(e: any, streamID: number): void;
    onBackToWebSocket(reason: WebTransportError, error: Error): void;
    private _onBackToWebSocket;
    send(msg: any, streamID: number, type: AccessHubMessageType, streamType: StreamType): Promise<void>;
    close(): Promise<void>;
    createStream(streamType: StreamType, streamID: number): Promise<IZegoWebTransportStream | null>;
    closeStream(streamID: number): Promise<void>;
    initReader(reader: ReadableStreamDefaultReader, streamID: number): Promise<void>;
}
export {};
