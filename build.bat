@echo off
set INKSCAPE="E:\inkscape\bin\inkscape.com"

%INKSCAPE% --export-type=png --export-filename=icon-192.png -w 192 -h 192 icon.svg
%INKSCAPE% --export-type=png --export-filename=icon-512.png -w 512 -h 512 icon.svg
%INKSCAPE% --export-type=png --export-filename=icon-512-maskable.png -w 512 -h 512 --export-margin=100 --export-area-page icon.svg

pause