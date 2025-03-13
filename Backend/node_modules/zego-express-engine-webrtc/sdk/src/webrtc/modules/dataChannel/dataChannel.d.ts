export declare const DataChannelMaxPacketSize: number;
export declare enum DataChannelMsgType {
    UserData = 1,
    Cmd = 2,
    Signal = 11,
    TcPadding = 12,
    TcFeedback = 13
}
export declare const DcMsgHeaderSize = 1;
export declare const DcUserDataMsgMaxSize = 65536;
export declare const DcUserDataMsgHeaderSize = 10;
export declare const DcUserDataMsgEnd = 1;
export declare const DcUserDataMsgTimeout = 4000;
