<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AuditController extends Controller
{
    public function index(): JsonResponse
    {
        // Minimal audit: recent logins via users table; in production use dedicated audit table
        $recent = DB::table('users')
            ->select('id', 'email', 'last_login_at', 'last_login_ip')
            ->orderByDesc('last_login_at')
            ->limit(50)
            ->get();

        return response()->json(['audit' => $recent]);
    }
}
