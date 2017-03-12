#include "node.h"
#include "node_buffer.h"


#include "enc.hpp"
#define LOG_BUF  128

#include <iostream>

using namespace v8;
using namespace node;

namespace miio{

Handle<Value> Add(const Arguments& args) {
  HandleScope scope;

  if (args.Length() < 2) {
    ThrowException(Exception::TypeError(String::New("Wrong number of arguments")));
    return scope.Close(Undefined());
  }

  if (!args[0]->IsNumber() || !args[1]->IsNumber()) {
    ThrowException(Exception::TypeError(String::New("Wrong arguments")));
    return scope.Close(Undefined());
  }

  double arg0 = args[0]->NumberValue();
  double arg1 = args[1]->NumberValue();
  Local<Number> num = Number::New(arg0 + arg1);

  String::AsciiValue v(args[2]->ToString());
  //printf("xxxxxxxxxx %s",v);

  //printf("xxxxxxxxxx %s",*v);

  num = Number::New( strlen(*v) );
  return scope.Close(num);
}

// did_h did_l ts tokenhex jsonstr
Handle<Value> doencrypt(const Arguments& args) {

    HandleScope scope;
    if(args.Length() < 5){
        return scope.Close(Null());
    }

    uint32_t did_h  = args[0]->Uint32Value();
    uint32_t did_l  = args[1]->Uint32Value();
    uint64_t did = ((uint64_t)did_h << 32 ) | did_l;
    uint32_t stamp = args[2]->Uint32Value();

    String::AsciiValue token(args[3]->ToString());
    String::AsciiValue message(args[4]->ToString());

    size_t tokenLen = strlen(*token);
    size_t messageLen = strlen(*message);

    char byteToken[md5_size] = {0};
    dehex((char *)(*token),tokenLen,byteToken,md5_size);


    int encslength = (( messageLen + AES_BLOCK_SIZE) / AES_BLOCK_SIZE) * AES_BLOCK_SIZE;
    char* res = (char *) malloc(header_size + encslength);

    if(res == NULL){
        return scope.Close(Null());
    }

    encrypt(did, byteToken, stamp,*message,messageLen,res,header_size + encslength );



    Buffer *slowBuffer = Buffer::New(header_size + encslength);
    memcpy(Buffer::Data(slowBuffer), res, header_size + encslength );

    Local<Object> globalObj = Context::GetCurrent()->Global();
    Local<Function> bufferConstructor = Local<Function>::Cast(globalObj->Get(String::New("Buffer")));
    Handle<Value> constructorArgs[3] = { slowBuffer->handle_, v8::Integer::New(header_size + encslength), v8::Integer::New(0) };
    Local<Object> actualBuffer = bufferConstructor->NewInstance(3, constructorArgs);


    free(res);
    return scope.Close(actualBuffer);

}

Handle<Value> dodecrypt(const Arguments& args) {
    HandleScope scope;

    if(args.Length() < 2){
        return scope.Close(Null());
    }

    String::AsciiValue token(args[0]->ToString());

    Local<Object> bufferObj    = args[1]->ToObject();
    char*         message   = Buffer::Data(bufferObj);


    size_t tokenLen = strlen(*token);
    size_t messageLen = Buffer::Length(bufferObj);

    char byteToken[md5_size] = {0};
    dehex((char *)(*token),tokenLen,byteToken,md5_size);

    //parse head
    uint16_t clength = 0;
    uint64_t cdid = 0;
    uint64_t didh = 0;
    uint64_t didl = 0;
    uint32_t cstamp = 0;
    char cmd5[md5_size] = {0};

    parse_msg_head(message , &clength, &cdid, &cstamp, cmd5);

    didh = (uint32_t)(cdid >> 32);
    didl = (uint32_t)(cdid);

    size_t infolen = 0;


    if(clength <= header_size || messageLen <= header_size){
        return scope.Close(Null());
    }

    //dectypt
    char * info = (char *)malloc(clength - header_size);
    if(info == NULL){
         return scope.Close(Null());
    }
    memset(info,0,clength - header_size);
    infolen = decrypt(message,clength,byteToken,info,clength - header_size);



    Local<Object> obj = Object::New();
    obj->Set(String::NewSymbol("message"), String::New(info));
    obj->Set(String::NewSymbol("length"), Uint32::New(clength));
    obj->Set(String::NewSymbol("messageLength"), Uint32::New(infolen));
    obj->Set(String::NewSymbol("ts"), Uint32::New(cstamp));
    obj->Set(String::NewSymbol("didh"), Uint32::New(didh));
    obj->Set(String::NewSymbol("didl"), Uint32::New(didl));


    free(info);
    return scope.Close(obj);
}


Handle<Value> hencrypt(const Arguments& args) {
    HandleScope scope;


    if(args.Length() < 4){
        return scope.Close(Null());
    }

    uint32_t did_h  = args[0]->Uint32Value();
    uint32_t did_l  = args[1]->Uint32Value();
    uint64_t did = ((uint64_t)did_h << 32 ) | did_l;
    uint32_t stamp = args[2]->Uint32Value();

    String::AsciiValue token(args[3]->ToString());

    size_t tokenLen = strlen(*token);

    char byteToken[md5_size] = {0};
    dehex((char *)(*token),tokenLen,byteToken,md5_size);


    char res[header_size] = {0};
    init_msg_head(res, did, stamp, byteToken,header_size);

    Buffer *slowBuffer = Buffer::New(header_size );
    memcpy(Buffer::Data(slowBuffer), res, header_size );

    Local<Object> globalObj = Context::GetCurrent()->Global();
    Local<Function> bufferConstructor = Local<Function>::Cast(globalObj->Get(String::New("Buffer")));
    Handle<Value> constructorArgs[3] = { slowBuffer->handle_, v8::Integer::New(header_size ), v8::Integer::New(0) };
    Local<Object> actualBuffer = bufferConstructor->NewInstance(3, constructorArgs);

    return scope.Close(actualBuffer);
}

Handle<Value> hdecrypt(const Arguments& args) {
    HandleScope scope;


    if(args.Length() < 1){
        return scope.Close(Null());
    }

    Local<Object> bufferObj    = args[0]->ToObject();
    char*         message   = Buffer::Data(bufferObj);

    //size_t messageLen = Buffer::Length(bufferObj);

    //parse head
    uint16_t clength = 0;
    uint64_t cdid = 0;
    uint64_t didh = 0;
    uint64_t didl = 0;
    uint32_t cstamp = 0;
    char cmd5[md5_size] = {0};

    parse_msg_head(message , &clength, &cdid, &cstamp, cmd5);

    char cmd5hex[33] = {0};
    hex(cmd5,md5_size,cmd5hex,33);
    didh = (uint32_t)(cdid >> 32);
    didl = (uint32_t)(cdid);


    Local<Object> obj = Object::New();

    obj->Set(String::NewSymbol("token"), String::New(cmd5hex));
    obj->Set(String::NewSymbol("length"), Uint32::New(clength));
    obj->Set(String::NewSymbol("ts"), Uint32::New(cstamp));
    obj->Set(String::NewSymbol("didh"), Uint32::New(didh));
    obj->Set(String::NewSymbol("didl"), Uint32::New(didl));

    return scope.Close(obj);

}

void Init(Handle<Object> exports) {
  exports->Set(String::NewSymbol("add"),
      FunctionTemplate::New(Add)->GetFunction());

  exports->Set(String::NewSymbol("encrypt"),
            FunctionTemplate::New(doencrypt)->GetFunction());

 exports->Set(String::NewSymbol("decrypt"),
            FunctionTemplate::New(dodecrypt)->GetFunction());

 exports->Set(String::NewSymbol("hencrypt"),
            FunctionTemplate::New(hencrypt)->GetFunction());

exports->Set(String::NewSymbol("hdecrypt"),
            FunctionTemplate::New(hdecrypt)->GetFunction());
}

}

NODE_MODULE(miio, miio::Init)



/*


JNIEXPORT jobject JNICALL Java_com_xiaomi_miio_JNIBridge_hdecrypt(JNIEnv *env,
        jclass jc, jbyteArray jb) {
    miio_d("hdecrypt begin");
    jbyte* jrawMsg = env->GetByteArrayElements(jb, NULL);
    jsize len = env->GetArrayLength(jb);

    char logstrstream[LOG_BUF] = {0};
    int ln = 0;
    ln += snprintf(logstrstream + ln,LOG_BUF- ln,"hdecrypt begin, got %u bytes msg",len);

    //parse head
    uint16_t clength = 0;
    uint64_t cdid = 0;
    uint32_t cstamp = 0;
    char cmd5[md5_size] = {0};
    parse_msg_head((char *)jrawMsg, clength, cdid, cstamp, cmd5);

    char cmd5hex[33] = {0};
    hex(cmd5,md5_size,cmd5hex,33);

    ln += snprintf(logstrstream + ln,LOG_BUF- ln,"did %llu ",cdid);
    ln += snprintf(logstrstream + ln,LOG_BUF- ln,"stamp %u ",cstamp);
    ln += snprintf(logstrstream + ln,LOG_BUF- ln,"length %u",clength);


    miio_d(logstrstream);

    jclass cls = env->FindClass("com/xiaomi/miio/JNIBridge$MiioMsg");
    jmethodID midInit = env->GetMethodID(cls, "<init>", "(JI[B[B)V");
    jlong did = 0;
    jint stamp = 0;
    jbyteArray token = NULL;
    jbyteArray msg = NULL;
    if (cdid != 0) {
        did = *(jlong*)(&cdid);
    }
    if (cstamp != 0) {
        stamp = *(jint*)(&cstamp);
    }

    token = env->NewByteArray(32);
    env->SetByteArrayRegion(token, 0, 32, (jbyte*) cmd5hex);

    jobject newObj = env->NewObject(cls, midInit, did, stamp, token, msg);

    env->ReleaseByteArrayElements(jb, jrawMsg, JNI_ABORT);
    return newObj;
}
*/
