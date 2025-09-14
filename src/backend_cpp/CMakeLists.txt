cmake_minimum_required(VERSION 3.20)
project(mswebapp_cpp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Build options
option(MSWEBAPP_WITH_OPENSSL "Enable HTTPS (requires OpenSSL)" OFF)

add_executable(mswebapp_cpp
    src/main.cpp
)

target_include_directories(mswebapp_cpp PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/third_party)

if (MSWEBAPP_WITH_OPENSSL)
    find_package(OpenSSL REQUIRED)
    target_link_libraries(mswebapp_cpp PRIVATE OpenSSL::SSL OpenSSL::Crypto)
    target_compile_definitions(mswebapp_cpp PRIVATE CPPHTTPLIB_OPENSSL_SUPPORT)
endif()

# Installation
install(TARGETS mswebapp_cpp RUNTIME DESTINATION bin)
