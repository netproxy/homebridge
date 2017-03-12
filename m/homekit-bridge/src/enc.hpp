
#include <string.h>
#include <malloc.h>
#include <stdio.h>
#include <stdint.h>


#include "crc8.hpp"
#include "lib_md5.h"
#include "lib_aes.h"


#define header_size  (32)
#define md5_size (16)
#define pk_size (4)

namespace miio{

#define __swap16gen(x)							\
    (uint16_t)(((uint16_t)(x) & 0xff) << 8 | ((uint16_t)(x) & 0xff00) >> 8)

#define __swap32gen(x)							\
    (uint32_t)(((uint32_t)(x) & 0xff) << 24 |			\
    ((uint32_t)(x) & 0xff00) << 8 | ((uint32_t)(x) & 0xff0000) >> 8 |\
    ((uint32_t)(x) & 0xff000000) >> 24)

#define __swap16 __swap16gen
#define __swap32 __swap32gen

#define htons(x) __swap16(x)
#define htonl(x) __swap32(x)
#define ntohs(x) __swap16(x)
#define ntohl(x) __swap32(x)


void miio_i(const char* info) {
    //__android_log_write(ANDROID_LOG_INFO, "miio-JNI", info);
}
void miio_d(const char* info) {
    //__android_log_write(ANDROID_LOG_DEBUG, "miio-JNI", info);
}
void miio_e(const char* err) {
    //__android_log_write(ANDROID_LOG_ERROR, "miio-JNI", err);
}

void hex(const char* bytetoken,const int bytetokensize,char* out,int outlen) {
    int n = 0;
    for(int i=0; i< bytetokensize ;i++){
        n += snprintf(out + n , outlen - n, "%.2x", (uint8_t)bytetoken[i] );
    }
}

void dehex(const char* hextoken,const int hextokensize,char* out,int outlen){
    for(int i = 0 ,j = 0; i  < hextokensize - 1 && j < outlen ; i += 2,j++){
        sscanf( hextoken + i, "%2hhx" , (uint8_t*)out + j );
    }
}

void miio_hexi(const char* info,int len){
    char * buf = (char *)malloc(len*2 + 1);
    hex(info,len,buf,len*2+1);
    //__android_log_write(ANDROID_LOG_INFO, "miio-JNI", buf);
    free(buf);
}

void md5(const char* message,int messageLen,char* v) {
    OI_Md5HashBuffer((BYTE *)v, (BYTE *) message , messageLen );
}


void init_msg_head(char *msg_head,uint64_t indid,
        uint32_t stamp, const char* md5_sign, uint16_t length) {
    int n = 0;
    msg_head[n++] = '!';
    msg_head[n++] = '1';

    uint32_t did_h = (uint32_t)(indid >> 32);
    uint32_t did_l = (uint32_t)(indid);

    uint16_t nlength = htons(length);
    memcpy(msg_head + n, (void *)&nlength , 2);
    n += 2;

    uint32_t ndid_h = htonl(did_h);
    memcpy(msg_head + n, (void *)&ndid_h,4);
    n += 4;

    uint32_t ndid_l = htonl(did_l);
    memcpy(msg_head + n, (void *)&ndid_l,4);
    n += 4;

    uint32_t nstamp = htonl(stamp);
    memcpy(msg_head + n, (void *)&nstamp,4);
    n += 4;

    memcpy(msg_head + n, (void *)md5_sign, md5_size);

}
void parse_msg_head(const char* result_head, uint16_t* length,
        uint64_t* did, uint32_t* stamp, char* token) {
    if (result_head[0] != '!') {
        return;
    }
    if (result_head[1] != '1') {
        return;
    }
    uint16_t _len = ntohs(*(uint16_t*)(result_head + 2 ));
    if (_len < 32) {
        return;
    }



    *length = _len;
    memcpy(token, result_head + 16,md5_size);



   uint32_t did_h = ntohl(
            *(uint32_t*)(result_head + 4));
    uint32_t did_l = ntohl(
            *(uint32_t*)(result_head + 8));
    uint64_t did_ = ((uint64_t)(did_h) << 32) | did_l;
    *did = did_;

    uint32_t _st = ntohl(
            *(uint32_t*)(result_head + 12));
    *stamp = _st;
}

void encrypt(const uint64_t indid, const char* token,const uint32_t stamp,const char* body, const int bodylen,char* msg,int msglength) {

    //const size_t encslength = (( bodylen + AES_BLOCK_SIZE) / AES_BLOCK_SIZE) * AES_BLOCK_SIZE;

    //std::vector<char> encjson(encslength, 0);
    //char* encjson = malloc(encslength);



    int outlen = 0;
    AES_cbc_encrypt((const unsigned char*)body, bodylen, (unsigned char*)msg + header_size, &outlen, (const unsigned char*)token, AES_ENCRYPT,16);


    init_msg_head(msg,indid,stamp,token,outlen + header_size);

    char sign[md5_size] = {0};
    md5(msg,msglength,sign);
    memcpy(msg + 16,sign,md5_size);

}

int decrypt(char* msg, const int msglen, const char* token,char* json,int jsonlen) {
    if (msglen <= 32) {
        return 0;
    }

    if (msg[0] != '!') {
        return 0;
    }

    if (msg[1] != '1') {
        return 0;
    }

    char insign[md5_size] = {0};
    memcpy(insign,msg+16,md5_size);

    memcpy(msg + 16, token , md5_size);
    char mysign[md5_size] = {0};
    md5(msg,msglen,mysign);

    if (memcmp(insign,mysign,md5_size) !=0) {
        return 0;
    }

    int outlen = 0;
    AES_cbc_encrypt((const unsigned char*)msg + header_size, msglen - header_size ,(unsigned char*)json, &outlen, (const unsigned char*)token, AES_DECRYPT,16);


    char* ptrpad = json + jsonlen - 1 ;
    uint8_t pad = *ptrpad;
    if (pad <= 16) {
        for (; pad > 0; pad--) {
            *ptrpad-- = '\0';
        }
        return outlen;
    }

    return 0;
}


}