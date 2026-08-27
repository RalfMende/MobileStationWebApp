# Copyright (C) 2025 OpenWrt.org
#
# This is free software, licensed under the GNU General Public License v2.
# See /LICENSE for more information.

include $(TOPDIR)/rules.mk

PKG_NAME:=mswebapp
PKG_VERSION:=1.1.9
PKG_RELEASE:=1

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)
PKG_BUILD_PARALLEL:=1

MSWEBAPP_ROOT:=$(abspath $(call my-dir)/../..)
MSWEBAPP_FILES:=$(abspath $(call my-dir)/files)

include $(INCLUDE_DIR)/package.mk
include $(INCLUDE_DIR)/cmake.mk

define Package/$(PKG_NAME)
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=MobileStation Web App
  DEPENDS:=+libstdcpp
endef

define Package/$(PKG_NAME)/description
  Maerklin Mobile Station inspired web UI to control locomotives and
  accessories using CS2/CS3-style configuration files.
endef

define Build/Prepare
	$(RM) -r $(PKG_BUILD_DIR)
	$(MKDIR) $(PKG_BUILD_DIR)
	$(CP) $(MSWEBAPP_ROOT)/src/backend_cpp/. $(PKG_BUILD_DIR)/
endef

CMAKE_OPTIONS += \
	-DMSWEBAPP_WITH_CAN=ON

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/usr/bin/mswebapp_cpp $(1)/usr/bin/mswebapp_cpp
	$(INSTALL_DIR) $(1)/usr/share/mswebapp/www
	$(CP) $(MSWEBAPP_FILES)/usr/share/mswebapp/www/. $(1)/usr/share/mswebapp/www/
	$(INSTALL_DIR) $(1)/usr/share/mswebapp/var
	$(CP) $(MSWEBAPP_FILES)/usr/share/mswebapp/var/. $(1)/usr/share/mswebapp/var/
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) $(MSWEBAPP_FILES)/etc/init.d/mswebapp $(1)/etc/init.d/mswebapp
endef

$(eval $(call BuildPackage,$(PKG_NAME)))