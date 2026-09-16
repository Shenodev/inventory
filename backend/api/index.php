<?php

// Vercel serverless entrypoint for the vercel-php (bref/vercel-php) runtime.
// Every request is rewritten here by backend/vercel.json and booted as public/index.php.
require __DIR__.'/../public/index.php';