cmd_Release/obj.target/miio.node := g++ -shared -pthread -rdynamic  -Wl,-soname=miio.node -o Release/obj.target/miio.node -Wl,--start-group Release/obj.target/miio/src/miio.o Release/obj.target/miio/src/lib_aes.o Release/obj.target/miio/src/lib_md5.o -Wl,--end-group 